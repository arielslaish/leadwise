// POST /api/score — CSV rows in, cleaned + Claude-scored rows out.
// Pipeline: rate-limit by IP -> parse -> clean/dedupe (src/lib/clean.ts)
// -> one batched Haiku call (src/lib/score.ts) -> return JSON. Nothing is stored.
export async function POST() {
  return Response.json({ error: "Not implemented yet" }, { status: 501 });
}
