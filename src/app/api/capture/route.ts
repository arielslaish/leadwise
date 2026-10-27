// POST /api/capture — the download gate. The visitor's email + consent is
// sent to the owner as a notification email (Resend). The scored CSV itself is
// built in the browser from data already there, so it never touches a server again.

import { Resend } from "resend";
import { z } from "zod";
import { CONSENT_TEXT } from "@/config/rubric";
import { clientIp, limits } from "@/lib/rateLimit";

const Body = z.object({
  email: z.email().max(200),
  consent: z.literal(true),
  stats: z.object({ rowsIn: z.number(), hot: z.number() }).optional(),
});

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "A valid email and consent are required." }, { status: 400 });

  const limit = await limits.capturePerIp.limit(clientIp(req));
  if (!limit.success) return Response.json({ error: "Too many requests. Try again tomorrow." }, { status: 429 });

  const { email, stats } = body.data;
  const key = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;
  if (!key || !to) {
    console.warn("capture: RESEND_API_KEY or NOTIFY_EMAIL missing, skipping notification");
    return Response.json({ ok: true });
  }

  const when = new Date().toISOString();
  const { error } = await new Resend(key).emails.send({
    from: process.env.NOTIFY_FROM ?? "Lead Engine <onboarding@resend.dev>",
    to,
    replyTo: email,
    subject: `Lead Engine: ${email} downloaded their scored list`,
    html: `<p><b>${escape(email)}</b> just used Lead Engine and downloaded their results.</p>
<ul>
  <li>When: ${when}</li>
  ${stats ? `<li>Rows uploaded: ${stats.rowsIn}, hot accounts: ${stats.hot}</li>` : ""}
  <li>Consent given: yes</li>
</ul>
<p><b>Consent text they agreed to:</b><br/><i>${escape(CONSENT_TEXT)}</i></p>
<p>Hit reply to reach them directly.</p>`,
  });

  if (error) {
    console.error("capture: notify failed:", error.message);
    // Don't block the visitor's download because of a notification failure.
  }
  return Response.json({ ok: true });
}
