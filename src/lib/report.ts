// Branded single-page (A4 portrait) PDF of the results: header, KPIs with small
// icons, tier mix, routing and the top leads. The full list stays in the CSV.
// Built in the browser like the CSV, so no data leaves it.

import type { Tier } from "@/config/rubric";
import type { FlowOutcome } from "./flow";
import type { ScoredLead } from "./score";

type Row = { lead: ScoredLead; flow: FlowOutcome };

export type ReportInput = {
  fileName: string;
  rows: Row[];
  kpis: { rowsIn: number; duplicatesRemoved: number; repHoursSaved: number };
  hotCount: number;
  avgScore: number;
};

const C = {
  deep: [12, 42, 30],
  forest: [31, 122, 79],
  bright: [47, 174, 107],
  mint: [139, 227, 176],
  soft: [226, 240, 231],
  ink: [16, 32, 26],
  ink2: [79, 93, 86],
  ink3: [147, 161, 154],
  line: [222, 228, 224],
} as const;

const TIER_RGB: Record<Tier, [number, number, number]> = {
  Hot: [227, 73, 72],
  Warm: [237, 161, 0],
  Nurture: [42, 120, 214],
  Disqualify: [154, 153, 147],
};

// Built-in PDF fonts only cover Latin-1, so transliterate everything else
// ("Oğuz Yılmaz" -> "Oguz Yilmaz", smart quotes -> plain) instead of printing garbage.
const SWAPS: Record<string, string> = {
  "ı": "i", "İ": "I", "ł": "l", "Ł": "L", "ß": "ss", "œ": "oe", "Œ": "OE",
  "—": "-", "–": "-", "‘": "'", "’": "'", "“": '"', "”": '"', "…": "...", "→": "->", "•": "·", "≥": ">=",
};
function t(s: string): string {
  let out = "";
  for (const ch of s) {
    if (ch.charCodeAt(0) <= 0xff) out += ch;
    else if (SWAPS[ch] !== undefined) out += SWAPS[ch];
    else out += ch.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\x00-\xff]/g, "");
  }
  return out;
}

export async function buildPdf(input: ReportInput) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const M = 14;
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const fill = (c: readonly number[]) => doc.setFillColor(c[0], c[1], c[2]);
  const text = (c: readonly number[]) => doc.setTextColor(c[0], c[1], c[2]);

  // Header band
  fill(C.deep);
  doc.rect(0, 0, W, 30, "F");
  fill(C.forest);
  doc.circle(W - 20, -6, 28, "F");
  fill(C.bright);
  doc.roundedRect(M, 9, 11, 11, 2.5, 2.5, "F");
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(M + 2.5, 11.6, 6, 1.2, 0.6, 0.6, "F");
  doc.roundedRect(M + 2.5, 14.2, 4, 1.2, 0.6, 0.6, "F");
  doc.roundedRect(M + 2.5, 16.8, 2, 1.2, 0.6, 0.6, "F");
  text([255, 255, 255]);
  doc.setFont("helvetica", "bold").setFontSize(16).text("leadwise", M + 14, 16.5);
  doc.setFont("helvetica", "normal").setFontSize(8);
  text(C.mint);
  doc.text(t(`Lead scoring report  ·  ${input.fileName}  ·  ${date}`), M + 14, 21.5);
  text([255, 255, 255]);
  doc.setFontSize(8).text("Built by Ariel Laish", W - M, 14, { align: "right" });
  text(C.mint);
  doc.text("linkedin.com/in/ariellaish", W - M, 19, { align: "right" });

  // Title
  text(C.ink);
  doc.setFont("helvetica", "bold").setFontSize(20).text("Who to call first", M, 44);

  // KPI tiles
  const kpis: [string, string][] = [
    [String(input.kpis.rowsIn), "Rows in"],
    [String(input.kpis.duplicatesRemoved), "Duplicates merged"],
    [String(input.hotCount), "Hot accounts"],
    [`${input.kpis.repHoursSaved}h`, "Rep hours saved (est.)"],
  ];
  const kw = (W - 2 * M - 3 * 4) / 4;
  // Small line icons, drawn in white on a green dot: list, merge, flame-ish target, clock.
  const icon = (kind: number, cx: number, cy: number) => {
    fill(C.forest);
    doc.circle(cx, cy, 3.6, "F");
    doc.setDrawColor(255, 255, 255).setLineWidth(0.45);
    doc.setFillColor(255, 255, 255);
    if (kind === 0) {
      [-1.3, 0, 1.3].forEach((dy, j) => doc.line(cx - 1.6, cy + dy, cx + 1.6 - j * 0.8, cy + dy));
    } else if (kind === 1) {
      doc.circle(cx - 0.7, cy, 1.3, "S");
      doc.circle(cx + 0.7, cy, 1.3, "S");
    } else if (kind === 2) {
      doc.circle(cx, cy, 1.8, "S");
      doc.circle(cx, cy, 0.6, "F");
    } else {
      doc.circle(cx, cy, 1.8, "S");
      doc.line(cx, cy, cx, cy - 1.2);
      doc.line(cx, cy, cx + 0.9, cy + 0.5);
    }
  };
  kpis.forEach(([v, l], i) => {
    const x = M + i * (kw + 4);
    fill(C.soft);
    doc.roundedRect(x, 50, kw, 22, 3, 3, "F");
    icon(i, x + kw - 7, 56.5);
    text(C.ink);
    doc.setFont("helvetica", "bold").setFontSize(17).text(v, x + 5, 61);
    text(C.ink2);
    doc.setFont("helvetica", "normal").setFontSize(7.5).text(l, x + 5, 67.5);
  });

  // Hero tiles
  const hw = (W - 2 * M - 4) / 2;
  const scored = input.rows.filter((r) => r.lead.tier !== "Disqualify").length;
  const hero: [readonly number[], string, string, string][] = [
    [C.forest, "Average lead score", String(input.avgScore), "of 100, excluding junk"],
    [C.bright, "Hot accounts", String(input.hotCount), `${scored ? Math.round((input.hotCount / scored) * 100) : 0}% of clean leads`],
  ];
  hero.forEach(([c, label, value, cap], i) => {
    const x = M + i * (hw + 4);
    fill(c);
    doc.roundedRect(x, 77, hw, 30, 4, 4, "F");
    text([255, 255, 255]);
    doc.setFont("helvetica", "normal").setFontSize(8).text(label, x + 6, 85);
    doc.setFont("helvetica", "bold").setFontSize(24).text(value, x + 6, 98);
    doc.setFont("helvetica", "normal").setFontSize(7.5).text(cap, x + 6, 103.5);
  });

  // Tier mix (left) and routing (right)
  const tiers: Tier[] = ["Hot", "Warm", "Nurture", "Disqualify"];
  const counts = new Map<Tier, number>();
  for (const r of input.rows) counts.set(r.lead.tier, (counts.get(r.lead.tier) ?? 0) + 1);
  const total = input.rows.length || 1;
  text(C.ink);
  doc.setFont("helvetica", "bold").setFontSize(10).text("Tier mix", M, 117);
  let bx = M;
  for (const tier of tiers) {
    const w = ((counts.get(tier) ?? 0) / total) * hw;
    if (!w) continue;
    doc.setFillColor(...TIER_RGB[tier]);
    doc.rect(bx, 120, Math.max(w - 0.6, 0.4), 3.5, "F");
    bx += w;
  }
  doc.setFont("helvetica", "normal").setFontSize(8);
  tiers.forEach((tier, i) => {
    const x = M + (i % 2) * (hw / 2);
    const y = 130 + Math.floor(i / 2) * 5.5;
    doc.setFillColor(...TIER_RGB[tier]);
    doc.circle(x + 1, y - 1, 1, "F");
    text(C.ink2);
    doc.text(tier, x + 4, y);
    text(C.ink);
    doc.text(String(counts.get(tier) ?? 0), x + hw / 2 - 6, y, { align: "right" });
  });

  const rx = M + hw + 4;
  text(C.ink);
  doc.setFont("helvetica", "bold").setFontSize(10).text("Routed to", rx, 117);
  const owners = new Map<string, number>();
  for (const r of input.rows) owners.set(r.flow.owner, (owners.get(r.flow.owner) ?? 0) + 1);
  doc.setFont("helvetica", "normal").setFontSize(8);
  [...owners.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .forEach(([o, n], i) => {
      const y = 123 + i * 4.6;
      text(C.ink2);
      doc.text(o, rx, y);
      text(C.ink);
      doc.text(String(n), W - M, y, { align: "right" });
    });

  // Top leads: just enough to act on, so the report stays one page
  const TOP = 6;
  const top = input.rows.filter((r) => r.lead.tier !== "Disqualify").slice(0, TOP);
  text(C.ink);
  doc.setFont("helvetica", "bold").setFontSize(12).text("Call these first", M, 158);
  doc.setFont("helvetica", "normal").setFontSize(7.5);
  text(C.ink3);
  doc.text(`Top ${top.length} of ${input.rows.length} leads · full ranked list in the CSV`, W - M, 158, { align: "right" });

  const rowH = 13;
  top.forEach(({ lead, flow }, i) => {
    const y = 162 + i * (rowH + 1.5);
    doc.setFillColor(i % 2 ? 255 : 246, i % 2 ? 255 : 249, i % 2 ? 255 : 247);
    doc.roundedRect(M, y, W - 2 * M, rowH, 2.5, 2.5, "F");
    // Score badge
    fill(C.deep);
    doc.roundedRect(M + 3, y + 2.5, 12, 8, 2, 2, "F");
    text([255, 255, 255]);
    doc.setFont("helvetica", "bold").setFontSize(10).text(String(lead.score), M + 9, y + 8.1, { align: "center" });
    // Name and title
    text(C.ink);
    doc.setFont("helvetica", "bold").setFontSize(8.5).text(t(`${lead.firstName} ${lead.lastName}`), M + 19, y + 5.4);
    text(C.ink2);
    doc.setFont("helvetica", "normal").setFontSize(7);
    doc.text(t(`${lead.title || "No title"} · ${lead.company || "-"}`).slice(0, 52), M + 19, y + 9.8);
    // Tier pill
    doc.setFillColor(...TIER_RGB[lead.tier]);
    doc.circle(M + 99, y + 6.5, 1.1, "F");
    text(C.ink);
    doc.setFont("helvetica", "bold").setFontSize(7.5).text(lead.tier, M + 101.5, y + 7.5);
    // Reason and queue
    text(C.ink2);
    doc.setFont("helvetica", "normal").setFontSize(6.8);
    const reason = doc.splitTextToSize(t(lead.reason), 58).slice(0, 2);
    doc.text(reason, M + 117, y + 5.2);
    text(C.forest);
    doc.setFont("helvetica", "bold").setFontSize(6.8).text(t(`» ${flow.owner}`), W - M - 3, y + 11, { align: "right" });
  });

  // Closing pitch
  const cy = 252;
  fill(C.deep);
  doc.roundedRect(M, cy, W - 2 * M, 24, 4, 4, "F");
  text(C.mint);
  doc.setFont("helvetica", "bold").setFontSize(7.5).text("BUILT BY ARIEL LAISH", M + 7, cy + 7.5);
  text([255, 255, 255]);
  doc.setFontSize(12).text("I built this for free. Imagine what I'd build for your team full-time.", M + 7, cy + 14);
  doc.setFont("helvetica", "normal").setFontSize(8);
  text(C.mint);
  doc.text("linkedin.com/in/ariellaish  ·  arielslaish@gmail.com", M + 7, cy + 20);

  // Footer
  doc.setDrawColor(...C.line).setLineWidth(0.2);
  doc.line(M, 283, W - M, 283);
  doc.setFont("helvetica", "normal").setFontSize(7);
  text(C.ink3);
  doc.text("Generated by Leadwise · leadwise-beta.vercel.app", M, 288);
  doc.text("Uploaded data is never stored", W - M, 288, { align: "right" });

  return doc;
}

export async function downloadPdf(input: ReportInput) {
  (await buildPdf(input)).save("leadwise-report.pdf");
}
