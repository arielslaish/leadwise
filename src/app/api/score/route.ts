// POST /api/score — CSV text in, cleaned + Claude-scored rows out.
// Pipeline: rate-limit by IP -> parse -> clean/dedupe -> one batched Haiku call.
// Nothing is stored or logged: the CSV lives only in this request's memory.

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { MAX_ROWS, MINUTES_SAVED_PER_ROW } from "@/config/rubric";
import { cleanRows, parseCsv } from "@/lib/clean";
import { checkScoreLimits, clientIp, isOwner } from "@/lib/rateLimit";
import { scoreLeads } from "@/lib/score";

export const maxDuration = 60;

const Body = z.object({ csv: z.string().min(1).max(200_000) });

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Send { csv } under 200KB." }, { status: 400 });

  const { rows: allRows, columns } = parseCsv(body.data.csv);
  if (allRows.length === 0) return Response.json({ error: "No rows found. Check the CSV has a header row." }, { status: 400 });
  if (!columns.includes("email") && !columns.includes("company")) {
    return Response.json(
      { error: "Couldn't find an email or company column. Name a column \"email\" or \"company\" and try again." },
      { status: 400 },
    );
  }
  // Long lists are trimmed rather than rejected, so any export works out of the box.
  const rows = allRows.slice(0, MAX_ROWS);

  // Validate before rate-limiting so a malformed file doesn't burn a visitor's quota.
  const owner = isOwner(req);
  if (!owner) {
    const limit = await checkScoreLimits(clientIp(req));
    if (!limit.ok) return Response.json({ error: limit.error }, { status: limit.status });
  }

  const cleaned = cleanRows(rows);
  try {
    const leads = await scoreLeads(cleaned.leads);
    return Response.json({
      kpis: {
        rowsIn: cleaned.rowsIn,
        duplicatesRemoved: cleaned.duplicatesRemoved,
        junkFlagged: cleaned.junkFlagged,
        hot: leads.filter((l) => l.tier === "Hot").length,
        repHoursSaved: Math.round((cleaned.rowsIn * MINUTES_SAVED_PER_ROW) / 6) / 10,
        truncatedFrom: allRows.length > MAX_ROWS ? allRows.length : null,
      },
      owner,
      leads,
    });
  } catch (err) {
    const status = err instanceof Anthropic.RateLimitError ? 429 : 502;
    console.error("score failed:", err instanceof Error ? err.message : "unknown");
    return Response.json({ error: "Scoring is temporarily unavailable. Try again shortly." }, { status });
  }
}
