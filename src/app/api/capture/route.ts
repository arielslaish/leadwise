// POST /api/capture — email gate. Creates a Lead in Salesforce via REST
// (src/lib/salesforce.ts); a record-triggered Flow routes it and adds a task.
export async function POST() {
  return Response.json({ error: "Not implemented yet" }, { status: 501 });
}
