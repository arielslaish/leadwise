// One set of numbers for every view. The dashboard, the CSV and the PDF are all
// built from buildRows() + summarize(), so they can't disagree.

import { MINUTES_SAVED_PER_ROW, TIER_ORDER, type Tier } from "@/config/rubric";
import type { DataQuality, ImportSummary } from "./clean";
import { classifyLead, flowContext, type FlowOutcome, type FlowVariables } from "./flow";
import type { ScoredLead } from "./score";

export type Row = { lead: ScoredLead; flow: FlowOutcome; correction: Tier | null };
export type Corrections = Record<number, Tier>; // lead id -> tier the user says is right

export function buildRows(leads: ScoredLead[], vars: FlowVariables, corrections: Corrections = {}): Row[] {
  const rank = (t: Tier) => TIER_ORDER.indexOf(t);
  const ctx = flowContext(leads, vars.hotRules);
  return leads
    .map((lead) => ({ lead, flow: classifyLead(lead, vars, ctx), correction: corrections[lead.id] ?? null }))
    .sort((a, b) => rank(a.flow.tier) - rank(b.flow.tier) || b.lead.score - a.lead.score);
}

const isPositive = (t: Tier) => t === "Hot" || t === "Warm";

export function summarize(rows: Row[], imp: ImportSummary) {
  const tiers = Object.fromEntries(TIER_ORDER.map((t) => [t, 0])) as Record<Tier, number>;
  const quality: Record<DataQuality, number> = { Valid: 0, "Needs review": 0, Invalid: 0 };
  const owners = new Map<string, number>();
  const issueCounts = new Map<string, number>();
  let tasks = 0;

  for (const { lead, flow } of rows) {
    tiers[flow.tier]++;
    quality[lead.quality]++;
    owners.set(flow.owner, (owners.get(flow.owner) ?? 0) + 1);
    if (flow.task) tasks++;
    for (const i of new Set(lead.issues.map((x) => x.code))) issueCounts.set(i, (issueCounts.get(i) ?? 0) + 1);
  }

  const scored = rows.filter((r) => r.lead.quality !== "Invalid");
  const c = (code: string) => issueCounts.get(code) ?? 0;

  const reviewed = rows.filter((r) => r.correction);
  return {
    leads: rows.length,
    tiers,
    hot: tiers.Hot,
    avgScore: scored.length ? Math.round(scored.reduce((s, r) => s + r.lead.score, 0) / scored.length) : 0,
    hotShareOfValid: scored.length ? Math.round((tiers.Hot / scored.length) * 100) : 0,
    quality,
    owners: [...owners.entries()].sort((a, b) => b[1] - a[1]),
    tasks,
    checks: {
      invalidEmails: c("email_malformed") + c("email_test"),
      missingEmails: c("email_missing"),
      missingNames: c("name_missing") + c("name_partial"),
      missingCompanies: c("company_missing"),
      missingTitles: c("title_missing"),
      invalidPhones: c("phone_invalid"),
      suspiciousNames: c("name_suspicious") + c("placeholder"),
      locationUnavailable: c("location_missing"),
      inconsistentFields: c("location_conflict") + c("size_unreadable") + c("domain_mismatch") + c("date_unreadable") + c("value_unreadable"),
    },
    duplicates: {
      merged: imp.duplicatesMerged,
      exact: imp.exactDuplicates,
      fuzzy: imp.fuzzyDuplicates,
      flaggedForReview: imp.possibleDuplicatePairs,
    },
    corrections: {
      reviewed: reviewed.length,
      agreed: reviewed.filter((r) => r.correction === r.flow.tier).length,
      falsePositives: reviewed.filter((r) => isPositive(r.flow.tier) && !isPositive(r.correction!)).length,
      falseNegatives: reviewed.filter((r) => !isPositive(r.flow.tier) && isPositive(r.correction!)).length,
    },
    import: imp,
    repHoursSaved: Math.round((imp.processed * MINUTES_SAVED_PER_ROW) / 6) / 10,
  };
}

export type Summary = ReturnType<typeof summarize>;

/** CSV records: every field explicit, never a silent blank. */
export function csvRecords(rows: Row[]) {
  return rows.map(({ lead, flow, correction }, i) => ({
    rank: i + 1,
    source_rows: lead.rowNumbers.join(" + "),
    first_name: lead.firstName || "Unavailable",
    last_name: lead.lastName || "Unavailable",
    email: lead.email || "Unavailable",
    phone: lead.phone || "Unavailable",
    title: lead.title || "Unavailable",
    company: lead.company || "Unavailable",
    segment: lead.segment,
    region: lead.region,
    country: lead.country,
    score: lead.score,
    tier: flow.tier,
    data_quality: lead.quality,
    data_issues: lead.issues.map((x) => x.label).join("; ") || "None",
    stage: lead.stage,
    last_activity: lead.lastActivity ?? "Unavailable",
    deal_value: lead.dealValue ?? "Unavailable",
    referral: lead.isReferral ? "Yes" : "No",
    hot_signals: lead.actions.join("; ") || "None",
    intent: lead.intent,
    intent_strength: lead.intentStrength,
    intent_evidence: lead.intentEvidence || "None",
    reason: lead.reason,
    score_breakdown: lead.breakdown.map((b) => `${b.criterion} ${b.points}/${b.max} (${b.value})`).join("; "),
    routed_to: flow.owner,
    routing_reason: flow.why,
    task: flow.taskLabel,
    merged_records: lead.merged.map((m) => `Row ${m.rowNumber} (${m.matchedOn})`).join("; ") || "None",
    possible_duplicates: lead.possibleDuplicateRows.map((r) => `Row ${r}`).join("; ") || "None",
    scored_by: lead.scoredBy,
    user_correction: correction ?? "",
  }));
}
