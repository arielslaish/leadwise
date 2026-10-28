// Step 2 of the pipeline: explainable scoring.
// Claude does the judgment calls (title seniority, industry fit, which buying
// signal the notes show, explicit "not interested"), returned as structured JSON.
// The points are added up here, in code, from the rubric, so every score has a
// line-by-line breakdown and the same inputs always give the same score.
// Invalid records skip the model entirely (they're routed to Data Hygiene).

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import {
  INDUSTRY_FIT,
  INTENTS,
  intentInfo,
  rubric,
  SENIORITY,
  type IndustryFit,
  type Intent,
  type IntentStrength,
  type Seniority,
} from "@/config/rubric";
import type { CleanLead, ScoredColumn } from "./clean";
import type { HotAction } from "./flow";

const client = new Anthropic();
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-5-5";

const ClassifySchema = z.object({
  results: z.array(
    z.object({
      id: z.number().int(),
      seniority: z.enum(SENIORITY),
      industryFit: z.enum(INDUSTRY_FIT),
      intent: z.enum(INTENTS),
      intentEvidence: z.string(),
      notInterested: z.boolean(),
      reason: z.string(),
    }),
  ),
});
type Classification = z.infer<typeof ClassifySchema>["results"][number];

export type ScoreLine = { criterion: string; value: string; points: number; max: number };

export type ScoredLead = CleanLead & {
  score: number; // 0-100: breakdown points / available points, rescaled to 100
  actions: HotAction[]; // concrete signals a user can define "Hot" by
  breakdown: ScoreLine[];
  seniority: Seniority;
  industryFit: IndustryFit;
  intent: Intent;
  intentStrength: IntentStrength;
  intentEvidence: string;
  notInterested: boolean;
  reason: string;
  scoredBy: "claude" | "rules" | "skipped";
};

const SYSTEM = `You classify B2B sales leads for a revenue team. You do NOT score them; code adds up points from your labels.

For each lead return:
- seniority: C-level, VP, Director, Manager, IC, or Unavailable (no title). Founders and "Head of" count as VP, or C-level at companies under 20 people. "Chief of Staff" is Director, not C-level.
- industryFit: Core (${rubric.industry.tiers[0].examples}), Adjacent (${rubric.industry.tiers[1].examples}), Other, or Unavailable (no industry and nothing in the company name or notes to infer it).
- intent: the STRONGEST buying signal in the notes, exactly one of:
  "Pricing or demo request" (asked for pricing, a quote, a demo or a trial),
  "Direct purchase intent" (ready to buy, has budget, asked for a contract or proposal),
  "Contract renewal coming up" (current vendor contract ending or up for renewal),
  "Expansion / multiple locations" (opening sites, many branches, scaling the team),
  "Evaluating vendors" (comparing options, running an RFP, shortlisting),
  "Event or meeting conversation" (met at an event, booth chat, intro call),
  "Content download / webinar" (downloaded a guide, attended a webinar, subscribed),
  "No signal found".
  A guide download or webinar is a weak signal, never a strong one.
- intentEvidence: the exact words from the notes that show the signal, or "" if none.
- notInterested: true only if the notes say plainly they are not interested, asked not to be contacted, or already bought elsewhere.
- reason: one plain sentence (max 22 words) a sales rep would find useful. Mention the signal if there is one. No score numbers.
Return one result per input id. Do not skip any.`;

function compact(l: CleanLead) {
  return {
    id: l.id,
    title: l.title || undefined,
    company: l.company || undefined,
    employees: l.companySize ?? undefined,
    industry: l.industry || undefined,
    region: l.region,
    notes: l.notes || undefined,
  };
}

// ---------- local rules (no API key in development, and the test suite) ----------

const localEnabled = () => !process.env.ANTHROPIC_API_KEY && process.env.NODE_ENV !== "production";

export function seniorityOf(title: string): Seniority {
  const t = title.toLowerCase();
  if (!t.trim()) return "Unavailable";
  if (/chief of staff|executive assistant to/.test(t)) return "Director";
  if (/\b(c[a-z]{1,2}o|chief|founder|co-founder|owner|president|managing director)\b/.test(t)) return "C-level";
  if (/\b(vp|svp|evp|vice president|head of)\b/.test(t)) return "VP";
  if (/\b(director|dir\.)\b/.test(t)) return "Director";
  if (/\b(manager|lead)\b/.test(t)) return "Manager";
  return "IC";
}

const CORE = /saas|software|fintech|cyber|security|data|ai\b|artificial intelligence|cloud|devops|platform/;
const ADJ = /tech|it services|e-?commerce|martech|marketing tech|hr ?tech|edtech|healthtech|insurtech|proptech/;
export function industryFitOf(industry: string): IndustryFit {
  const i = industry.toLowerCase();
  if (!i.trim()) return "Unavailable";
  if (CORE.test(i)) return "Core";
  if (ADJ.test(i)) return "Adjacent";
  return "Other";
}

const NOT_INTERESTED = /not interested|no interest|unsubscribe|do not contact|don'?t contact|remove me|stop (emailing|contacting)|already (bought|signed|chose)|went with (a |another )?(competitor|vendor)/i;
const INTENT_RULES: [Intent, RegExp][] = [
  ["Pricing or demo request", /pricing|price|quote|demo|trial|cost/i],
  ["Direct purchase intent", /ready to (buy|sign|purchase)|budget (approved|allocated)|proposal|contract (draft|to sign)|purchase order|want(s)? to buy/i],
  ["Contract renewal coming up", /renewal|renew\b|contract[^.]{0,40}\b(end|ends|ending|expire|expires|expiring|up)\b|current vendor contract/i],
  ["Expansion / multiple locations", /multiple (locations|sites|offices|branches)|\d+ (locations|sites|offices|branches|stores)|expanding|new (office|location)|scaling/i],
  ["Evaluating vendors", /evaluat|compar|rfp|shortlist|vendor (search|selection)|considering/i],
  ["Event or meeting conversation", /met at|booth|event|conference|intro call|wants a call|follow up/i],
  ["Content download / webinar", /download|guide|ebook|e-book|whitepaper|webinar|newsletter|subscribed/i],
];

export function classifyLocally(l: CleanLead): Classification {
  const notes = l.notes;
  const hit = INTENT_RULES.find(([, re]) => re.test(notes));
  const evidence = hit ? (notes.match(hit[1])?.[0] ?? "") : "";
  const seniority = seniorityOf(l.title);
  const intent = hit?.[0] ?? "No signal found";
  return {
    id: l.id,
    seniority,
    industryFit: industryFitOf(l.industry),
    intent,
    intentEvidence: evidence,
    notInterested: NOT_INTERESTED.test(notes),
    reason:
      intent !== "No signal found"
        ? `${seniority === "Unavailable" ? "Contact" : seniority} at ${l.company || "an unknown company"}; ${intent.toLowerCase()}.`
        : `${seniority === "Unavailable" ? "Contact" : seniority} at ${l.company || "an unknown company"}; no buying signal in the notes yet.`,
  };
}

// ---------- points ----------

// Which criterion depends on which column. If the whole file lacks a column, that
// criterion is left out and the score is rescaled, instead of costing every lead points.
const NEEDS: Record<string, ScoredColumn> = {
  [rubric.companySize.label]: "Company size",
  [rubric.industry.label]: "Industry",
  [rubric.seniority.label]: "Title",
  [rubric.intent.label]: "Notes",
};

export function scoreFrom(l: CleanLead, c: Classification, missing: ScoredColumn[] = []): Pick<ScoreBits, "score" | "breakdown"> {
  const size = rubric.companySize.bands.find((b) => b.band === l.sizeBand) ?? rubric.companySize.bands.at(-1)!;
  const sen = rubric.seniority.levels.find((s) => s.level === c.seniority)!;
  const ind = rubric.industry.tiers.find((t) => t.fit === c.industryFit)!;
  const intent = intentInfo(c.intent);
  const reg = rubric.region.tiers.find((t) => (t.match as readonly string[]).includes(l.region)) ?? rubric.region.tiers[2];
  const warnings = l.issues.filter((i) => i.severity === "warning").length;
  const completeness = Math.max(0, rubric.completeness.weight - 2 * warnings);

  const breakdown: ScoreLine[] = [
    { criterion: rubric.companySize.label, value: l.sizeBand, points: size.points, max: rubric.companySize.weight },
    { criterion: rubric.seniority.label, value: c.seniority, points: sen.points, max: rubric.seniority.weight },
    { criterion: rubric.industry.label, value: c.industryFit, points: ind.points, max: rubric.industry.weight },
    { criterion: rubric.intent.label, value: c.intent, points: intent.points, max: rubric.intent.weight },
    { criterion: rubric.region.label, value: l.region, points: reg.points, max: rubric.region.weight },
    {
      criterion: rubric.completeness.label,
      value: warnings ? `${warnings} warning${warnings > 1 ? "s" : ""}` : "Complete",
      points: completeness,
      max: rubric.completeness.weight,
    },
  ];
  const used = breakdown.map((b) =>
    missing.includes(NEEDS[b.criterion]) ? { ...b, value: "Not in your file", points: 0, max: 0 } : b,
  );
  const max = used.reduce((s, b) => s + b.max, 0) || 1;
  return { score: Math.round((used.reduce((s, b) => s + b.points, 0) / max) * 100), breakdown: used };
}

type ScoreBits = { score: number; breakdown: ScoreLine[] };

const STAGE_ACTIONS: Partial<Record<CleanLead["stage"], HotAction>> = {
  "Meeting booked": "Meeting booked",
  "Proposal sent": "Proposal sent",
  Qualified: "Qualified",
};
const INTENT_ACTIONS: Partial<Record<Intent, HotAction>> = {
  "Pricing or demo request": "Pricing or demo request",
  "Direct purchase intent": "Direct purchase intent",
  "Contract renewal coming up": "Contract renewal",
  "Expansion / multiple locations": "Expansion",
  "Evaluating vendors": "Evaluating vendors",
};
export function actionsOf(l: CleanLead, intent: Intent): HotAction[] {
  return [INTENT_ACTIONS[intent], STAGE_ACTIONS[l.stage], l.isReferral ? ("Referral" as const) : undefined].filter(
    (a): a is HotAction => Boolean(a),
  );
}

async function classifyChunk(leads: CleanLead[]): Promise<Classification[]> {
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    // Labelling is a lookup task: skipping thinking cuts latency a lot.
    thinking: { type: "disabled" },
    output_config: { effort: "low", format: zodOutputFormat(ClassifySchema) },
    system: SYSTEM,
    messages: [{ role: "user", content: `Classify these leads:\n${leads.map((l) => JSON.stringify(compact(l))).join("\n")}` }],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error(`Scoring failed (stop_reason: ${response.stop_reason})`);
  }
  return response.parsed_output.results;
}

const CHUNK_SIZE = 10;

export async function scoreLeads(leads: CleanLead[], missing: ScoredColumn[] = []): Promise<ScoredLead[]> {
  const scorable = leads.filter((l) => l.quality !== "Invalid");
  const byId = new Map<number, Classification>();
  let source: ScoredLead["scoredBy"] = "rules";

  if (scorable.length && localEnabled()) {
    for (const l of scorable) byId.set(l.id, classifyLocally(l));
  } else if (scorable.length) {
    // Output generation dominates latency, so classify chunks in parallel.
    const chunks: CleanLead[][] = [];
    for (let i = 0; i < scorable.length; i += CHUNK_SIZE) chunks.push(scorable.slice(i, i + CHUNK_SIZE));
    const results = await Promise.all(chunks.map(classifyChunk));
    for (const r of results.flat()) byId.set(r.id, r);
    source = "claude";
  }

  return leads
    .map((l): ScoredLead => {
      // Invalid records and anything the model skipped still get a full, rule-based breakdown.
      const fromModel = byId.get(l.id);
      const c = fromModel ?? classifyLocally(l);
      const scoredBy = l.quality === "Invalid" ? "skipped" : fromModel ? source : "rules";
      const info = intentInfo(c.intent);
      return {
        ...l,
        ...scoreFrom(l, c, missing),
        actions: l.quality === "Invalid" ? [] : actionsOf(l, c.intent),
        seniority: c.seniority,
        industryFit: c.industryFit,
        intent: c.intent,
        intentStrength: info.strength,
        intentEvidence: c.intentEvidence,
        notInterested: c.notInterested,
        reason: l.quality === "Invalid" ? `Not scored for outreach: ${l.issues.filter((i) => i.severity === "error").map((i) => i.label.toLowerCase()).join("; ")}.` : c.reason,
        scoredBy,
      };
    })
    .sort((a, b) => b.score - a.score);
}
