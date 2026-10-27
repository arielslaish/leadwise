// Step 2 of the pipeline: one batched Claude Haiku call scores every clean lead
// against the rubric. Junk rows skip the model entirely (saves tokens).
// Tier is derived from the score in code, so thresholds stay deterministic.

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { rubric, type Tier } from "@/config/rubric";
import type { CleanLead } from "./clean";

const client = new Anthropic();
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-5-5";

const ScoreSchema = z.object({
  results: z.array(
    z.object({
      id: z.number().int(),
      score: z.number().int(),
      seniority: z.enum(["C-level", "VP", "Director", "Manager", "IC"]),
      intent: z.string(),
      reason: z.string(),
    }),
  ),
});

export type ScoredLead = CleanLead & {
  score: number;
  tier: Tier;
  seniority: string;
  intent: string;
  reason: string;
};

const SYSTEM = `You are a RevOps lead-scoring engine for a B2B SaaS revenue team.
Score each lead 0-100 using exactly this rubric (points per criterion, summed):

${JSON.stringify(rubric, null, 1)}

Rules:
- Classify title seniority into one of: C-level, VP, Director, Manager, IC. Founders and "Head of" count as VP unless the company is under 20 people (then C-level).
- Map industry to the closest rubric tier. Unknown industry = "Other".
- Intent comes only from the notes field. Name the strongest signal in a few words, or "None".
- Completeness: full 10 points only if every field is present and email is a business domain. Free-mail domains (gmail etc.) lose 5.
- reason: one plain sentence (max 20 words) a sales rep would find useful. No score numbers.
- Return one result per input id. Do not skip any.`;

function tierFor(score: number): Tier {
  return rubric.tiers.find((t) => score >= t.min)!.tier;
}

function compact(l: CleanLead) {
  return {
    id: l.id, title: l.title, company: l.company, employees: l.companySize,
    industry: l.industry, region: l.region, country: l.country,
    freeEmail: l.freeEmail, notes: l.notes || undefined,
  };
}

export async function scoreLeads(leads: CleanLead[]): Promise<ScoredLead[]> {
  const valid = leads.filter((l) => !l.junkReason);
  const byId = new Map<number, z.infer<typeof ScoreSchema>["results"][number]>();

  if (valid.length) {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "low", format: zodOutputFormat(ScoreSchema) },
      system: SYSTEM,
      messages: [
        { role: "user", content: `Score these leads:\n${valid.map((l) => JSON.stringify(compact(l))).join("\n")}` },
      ],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      throw new Error(`Scoring failed (stop_reason: ${response.stop_reason})`);
    }
    for (const r of response.parsed_output.results) byId.set(r.id, r);
  }

  return leads
    .map((l): ScoredLead => {
      if (l.junkReason) {
        return { ...l, score: 0, tier: "Disqualify", seniority: "-", intent: "None", reason: l.junkReason };
      }
      const r = byId.get(l.id);
      if (!r) {
        return { ...l, score: 0, tier: "Nurture", seniority: "-", intent: "None", reason: "Not scored, review manually." };
      }
      const score = Math.max(0, Math.min(100, r.score));
      return { ...l, score, tier: tierFor(score), seniority: r.seniority, intent: r.intent, reason: r.reason };
    })
    .sort((a, b) => b.score - a.score);
}
