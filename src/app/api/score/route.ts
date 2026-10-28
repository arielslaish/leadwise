// POST /api/score — CSV text in, cleaned + scored leads and an import summary out.
// Pipeline: parse -> rate-limit by IP -> clean/validate/dedupe -> classify with Claude.
// Tier and routing are applied by the client (src/lib/flow.ts) so the sliders work live.
// Nothing is stored or logged: the CSV lives only in this request's memory.

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { cleanRows, parseCsv } from "@/lib/clean";
import { checkScoreLimits, clientIp, isOwner } from "@/lib/rateLimit";
import { scoreLeads } from "@/lib/score";

export const maxDuration = 60;

const Body = z.object({ csv: z.string().min(1).max(200_000) });

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Send { csv } under 200KB." }, { status: 400 });

  const { rows: allRows, columns, emptyRows } = parseCsv(body.data.csv);
  if (allRows.length === 0) return Response.json({ error: "No rows found. Check the CSV has a header row." }, { status: 400 });
  if (!columns.includes("email") && !columns.includes("company")) {
    return Response.json(
      { error: "Couldn't find an email or company column. Name a column \"email\" or \"company\" and try again." },
      { status: 400 },
    );
  }
  // Validate before rate-limiting so a malformed file doesn't burn a visitor's quota.
  const owner = isOwner(req);
  if (!owner) {
    const limit = await checkScoreLimits(clientIp(req));
    if (!limit.ok) return Response.json({ error: limit.error }, { status: limit.status });
  }

  // Lists over the limit are processed up to MAX_ROWS; the rest are counted and reported, not dropped silently.
  const cleaned = cleanRows(allRows, emptyRows);
  try {
    const leads = await scoreLeads(cleaned.leads, cleaned.summary.missingColumns);
    return Response.json({ import: cleaned.summary, owner, leads });
  } catch (err) {
    const status = err instanceof Anthropic.RateLimitError ? 429 : 502;
    console.error("score failed:", err instanceof Error ? err.message : "unknown");
    return Response.json({ error: "Scoring is temporarily unavailable. Try again shortly." }, { status });
  }
}
