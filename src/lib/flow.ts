// The single source of truth for tier and routing. Every view (dashboard,
// CSV, PDF) calls classifyLead with the same variables, so their counts agree.
//
// Mirrors the Salesforce record-triggered Flow in
// salesforce/force-app/.../Leadwise_Lead_Routing.flow-meta.xml: Leadwise sets
// Data_Quality__c and Lead_Tier__c, the Flow routes on them. Keep the two in sync.
//
// Order of decisions:
//   1. Invalid data              -> Disqualify, Data Hygiene (fix before outreach)
//   2. Explicitly not interested -> Disqualify, Do Not Contact
//      (unless there is also a strong buying signal: conflicting, sent to review)
//   3. Score >= Hot threshold,   -> Hot, regional AE (or Strategic), call task
//      or matches the user's own Hot rules (actions, recency, deal value)
//   4. Score >= Warm threshold   -> Warm, SDR, outreach task
//   5. Strong buying signal      -> Warm, SDR (optional promotion, on by default)
//   6. Everything else (valid)   -> Nurture, never Disqualify for a low score

import type { Tier } from "@/config/rubric";
import type { ScoredLead } from "./score";

// Concrete things a lead did that a user can choose to treat as "Hot".
export const HOT_ACTIONS = [
  "Pricing or demo request",
  "Direct purchase intent",
  "Contract renewal",
  "Expansion",
  "Evaluating vendors",
  "Meeting booked",
  "Proposal sent",
  "Qualified",
  "Referral",
] as const;
export type HotAction = (typeof HOT_ACTIONS)[number];

export type HotRules = {
  enabled: boolean;
  actions: HotAction[]; // any of these counts (empty = don't filter by action)
  withinDays: number | null; // last activity within N days (null = any time)
  fromNewestDate: boolean; // measure days from the newest date in the file instead of today
  minValue: number | null; // deal value at least this (null = any)
};

export type FlowVariables = {
  hotThreshold: number; // score at/above which a lead is Hot
  hotTaskDueDays: number; // SLA for the first touch on Hot leads
  warmThreshold: number; // score at/above which a lead is Warm
  warmTaskDueDays: number; // days until the SDR outreach task is due
  enterpriseToStrategic: boolean; // Hot Enterprise accounts skip regional AEs
  promoteStrongSignals: boolean; // a strong buying signal lifts a low score to Warm
  hotRules: HotRules;
};

export const defaultFlowVariables: FlowVariables = {
  hotThreshold: 75,
  hotTaskDueDays: 1,
  warmThreshold: 55,
  warmTaskDueDays: 3,
  enterpriseToStrategic: false,
  promoteStrongSignals: true,
  hotRules: {
    enabled: true,
    actions: ["Pricing or demo request", "Direct purchase intent", "Contract renewal", "Meeting booked", "Proposal sent"],
    withinDays: 14,
    fromNewestDate: true,
    minValue: null,
  },
};

/** Context computed once per list: the date "N days ago" is measured from. */
export type FlowContext = { referenceDate: string | null };

export function flowContext(leads: { lastActivity: string | null }[], rules: HotRules, today = new Date()): FlowContext {
  const dates = leads.map((l) => l.lastActivity).filter((d): d is string => Boolean(d));
  if (!dates.length) return { referenceDate: null }; // file has no dates: recency can't apply
  return { referenceDate: rules.fromNewestDate ? dates.sort().at(-1)! : today.toISOString().slice(0, 10) };
}

export const daysSince = (date: string, ref: string) => Math.round((Date.parse(ref) - Date.parse(date)) / 86_400_000);

/** Does this lead meet the user's Hot definition? Returns the matching parts, or null. */
export function matchHotRules(
  lead: Pick<ScoredLead, "actions" | "lastActivity" | "dealValue">,
  rules: HotRules,
  ctx: FlowContext,
): string[] | null {
  if (!rules.enabled) return null;
  const parts: string[] = [];
  let conditions = 0;
  if (rules.actions.length) {
    conditions++;
    const hit = lead.actions.filter((a) => rules.actions.includes(a));
    if (!hit.length) return null;
    parts.push(hit.join(" + "));
  }
  if (rules.withinDays != null && ctx.referenceDate) {
    conditions++;
    if (!lead.lastActivity) return null;
    const d = daysSince(lead.lastActivity, ctx.referenceDate);
    if (d > rules.withinDays) return null;
    parts.push(`last touch ${d === 0 ? "same day" : `${d} day${d > 1 ? "s" : ""}`}${rules.fromNewestDate ? " before the newest in the file" : " ago"}`);
  }
  if (rules.minValue != null) {
    conditions++;
    if (lead.dealValue == null || lead.dealValue < rules.minValue) return null;
    parts.push(`value ${lead.dealValue.toLocaleString("en-US")}`);
  }
  return conditions ? parts : null;
}

const QUEUE_BY_REGION: Record<string, string> = {
  "North America": "AMER AE Queue",
  Israel: "ISR AE Queue",
  UK: "EMEA AE Queue",
  DACH: "EMEA AE Queue",
  "Rest of Europe": "EMEA AE Queue",
  ANZ: "APAC AE Queue",
};

export type Task = { subject: string; priority: "High" | "Normal" | "Low"; dueInDays: number };

export type FlowOutcome = {
  tier: Tier;
  owner: string;
  task: Task | null;
  taskLabel: string; // always filled, so exports never show a silent blank
  why: string; // plain-English routing decision
};

const days = (n: number) => (n === 0 ? "today" : `in ${n} day${n > 1 ? "s" : ""}`);
export const taskText = (t: Task) => `${t.subject} (${t.priority}, due ${days(t.dueInDays)})`;

type LeadForFlow = Pick<
  ScoredLead,
  "score" | "region" | "segment" | "quality" | "issues" | "notInterested" | "intent" | "intentStrength" | "actions" | "lastActivity" | "dealValue"
>;

export function classifyLead(lead: LeadForFlow, vars: FlowVariables, ctx: FlowContext = { referenceDate: null }): FlowOutcome {
  const withTask = (o: Omit<FlowOutcome, "taskLabel">): FlowOutcome => ({ ...o, taskLabel: o.task ? taskText(o.task) : "" });
  const review = lead.quality === "Needs review" ? " Data needs a quick review." : "";

  if (lead.quality === "Invalid") {
    const errors = lead.issues.filter((i) => i.severity === "error").map((i) => i.label.toLowerCase());
    return withTask({
      tier: "Disqualify",
      owner: "Data Hygiene Queue",
      task: { subject: "Fix record before outreach", priority: "Low", dueInDays: 2 },
      why: `Invalid data: ${errors.join("; ")}.`,
    });
  }

  if (lead.notInterested) {
    if (lead.intentStrength === "Strong") {
      return withTask({
        tier: "Nurture",
        owner: "Marketing Nurture",
        task: { subject: "Review conflicting signals", priority: "Normal", dueInDays: vars.warmTaskDueDays },
        why: `Conflicting signals: "${lead.intent}" but also not interested. Held in Nurture for a human to review.`,
      });
    }
    return { tier: "Disqualify", owner: "Do Not Contact", task: null, taskLabel: "None: asked not to be contacted", why: "Explicitly not interested." };
  }

  const rule = lead.score >= vars.hotThreshold ? null : matchHotRules(lead, vars.hotRules, ctx);
  if (lead.score >= vars.hotThreshold || rule) {
    const strategic = vars.enterpriseToStrategic && lead.segment === "Enterprise";
    const because = rule
      ? `Matches your Hot rule: ${rule.join(", ")} (score ${lead.score}).`
      : `Score ${lead.score} is at or above the Hot threshold (${vars.hotThreshold}).`;
    return withTask({
      tier: "Hot",
      owner: strategic ? "Strategic Accounts Queue" : (QUEUE_BY_REGION[lead.region] ?? "Global AE Queue"),
      task: { subject: "Call within SLA: hot lead", priority: "High", dueInDays: vars.hotTaskDueDays },
      why: `${because}${strategic ? " Enterprise account, so Strategic AEs." : ""}${review}`,
    });
  }

  if (lead.score >= vars.warmThreshold) {
    return withTask({
      tier: "Warm",
      owner: "SDR Queue",
      task: { subject: "Personalized outreach sequence", priority: "Normal", dueInDays: vars.warmTaskDueDays },
      why: `Score ${lead.score} is at or above the Warm threshold (${vars.warmThreshold}).${review}`,
    });
  }

  if (vars.promoteStrongSignals && lead.intentStrength === "Strong") {
    return withTask({
      tier: "Warm",
      owner: "SDR Queue",
      task: { subject: "Follow up on buying signal", priority: "Normal", dueInDays: vars.warmTaskDueDays },
      why: `Strong buying signal ("${lead.intent}") promoted to Warm even though the score is ${lead.score}.${review}`,
    });
  }

  return {
    tier: "Nurture",
    owner: "Marketing Nurture",
    task: null,
    taskLabel: "None: added to nurture sequence",
    why: `Valid lead, score ${lead.score} is below the Warm threshold (${vars.warmThreshold}), so it stays in Nurture.${review}`,
  };
}
