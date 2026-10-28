"use client";

// Import transparency and the quality audit. Every number here comes from the
// same summarize() call the CSV and PDF use.

import { useState } from "react";
import { MAX_ROWS } from "@/config/rubric";
import type { Row, Summary } from "@/lib/summary";

function Stat({ value, label, note }: { value: number | string; label: string; note?: string }) {
  return (
    <div className="rounded-2xl bg-white/70 p-3 ring-1 ring-line">
      <div className="font-display text-2xl font-medium leading-none">{value}</div>
      <div className="mt-1 text-[11px] text-ink-2">{label}</div>
      {note && <div className="mt-0.5 text-[10px] text-ink-3">{note}</div>}
    </div>
  );
}

function Disclosure({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  if (!count) return null;
  return (
    <div className="border-t border-line pt-2">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between py-1 text-left text-xs">
        <span className="font-medium">
          {title} <span className="text-ink-3">({count})</span>
        </span>
        <span className="text-brand">{open ? "Hide" : "Show"}</span>
      </button>
      {open && <div className="max-h-56 overflow-y-auto pb-2 text-xs text-ink-2">{children}</div>}
    </div>
  );
}

const nameOf = (r: Row) => `${r.lead.firstName} ${r.lead.lastName}`.trim() || r.lead.email || "Unnamed record";

export function ImportPanel({ summary, rows }: { summary: Summary; rows: Row[] }) {
  const imp = summary.import;
  const invalid = rows.filter((r) => r.lead.quality === "Invalid");
  const mergedLeads = rows.filter((r) => r.lead.merged.length);
  const flagged = rows.filter((r) => r.lead.possibleDuplicateRows.length);
  const skipped = imp.overLimit.count + imp.emptyRowsSkipped;

  return (
    <section className="card p-5">
      <h3 className="font-display text-base font-medium">Import summary</h3>
      <p className="text-[11px] text-ink-3">Every uploaded row is accounted for. The demo processes up to {MAX_ROWS} rows per upload.</p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Stat value={imp.rowsInFile + imp.emptyRowsSkipped} label="Rows uploaded" />
        <Stat value={imp.processed} label="Processed" />
        <Stat value={imp.duplicatesMerged} label="Merged" note="into another lead" />
        <Stat value={invalid.length} label="Rejected" note="invalid, to Data Hygiene" />
        <Stat value={skipped} label="Skipped" note={imp.overLimit.count ? `over the ${MAX_ROWS}-row limit` : "empty rows"} />
      </div>
      <p className="mt-3 text-[11px] text-ink-2">
        {imp.processed} processed − {imp.duplicatesMerged} merged = {imp.leadsOut} leads in this report, of which {invalid.length} are rejected as invalid.
      </p>

      <div className="mt-3 space-y-1">
        {imp.overLimit.count > 0 && (
          <div className="rounded-xl bg-warm/10 px-3 py-2 text-xs text-[#8a5d00]">
            Rows {imp.overLimit.firstRow}–{imp.overLimit.lastRow} ({imp.overLimit.count} rows) were not processed because of the {MAX_ROWS}-row
            limit. Split the file to score them.
          </div>
        )}
        {imp.emptyRowsSkipped > 0 && <p className="text-xs text-ink-3">{imp.emptyRowsSkipped} completely empty rows were skipped.</p>}
        <Disclosure title="Rejected records" count={invalid.length}>
          <ul className="space-y-1.5">
            {invalid.map((r) => (
              <li key={r.lead.id}>
                <span className="font-medium text-ink">Row {r.lead.rowNumbers.join(", ")}</span> · {nameOf(r)}:{" "}
                {r.lead.issues.filter((i) => i.severity === "error").map((i) => i.label).join("; ")}
              </li>
            ))}
          </ul>
        </Disclosure>
        <Disclosure title="Merged records" count={mergedLeads.length}>
          <ul className="space-y-1.5">
            {mergedLeads.map((r) => (
              <li key={r.lead.id}>
                <span className="font-medium text-ink">Row {r.lead.rowNumbers[0]}</span> · {nameOf(r)} kept; merged{" "}
                {r.lead.merged.map((m) => `row ${m.rowNumber} (${m.matchedOn.toLowerCase()})`).join(", ")}
              </li>
            ))}
          </ul>
        </Disclosure>
        <Disclosure title="Possible duplicates, not merged" count={flagged.length}>
          <ul className="space-y-1.5">
            {flagged.map((r) => (
              <li key={r.lead.id}>
                <span className="font-medium text-ink">Row {r.lead.rowNumbers[0]}</span> · {nameOf(r)} looks like row{" "}
                {r.lead.possibleDuplicateRows.join(", ")}. Kept separate because the details conflict.
              </li>
            ))}
          </ul>
        </Disclosure>
      </div>
    </section>
  );
}

export function AuditPanel({ summary }: { summary: Summary }) {
  const c = summary.checks;
  const q = summary.quality;
  const corr = summary.corrections;
  const checks: [string, number][] = [
    ["Invalid emails", c.invalidEmails],
    ["Missing emails", c.missingEmails],
    ["Missing or partial names", c.missingNames],
    ["Missing companies", c.missingCompanies],
    ["Missing job titles", c.missingTitles],
    ["Invalid phones", c.invalidPhones],
    ["Suspicious or placeholder names", c.suspiciousNames],
    ["Location unavailable", c.locationUnavailable],
    ["Inconsistent fields", c.inconsistentFields],
  ];

  return (
    <section className="card p-5">
      <h3 className="font-display text-base font-medium">Quality audit</h3>
      <p className="text-[11px] text-ink-3">Data quality and lead quality are scored separately.</p>

      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium">Data quality</p>
          <ul className="space-y-1 text-xs">
            {(["Valid", "Needs review", "Invalid"] as const).map((k) => (
              <li key={k} className="flex justify-between">
                <span className="text-ink-2">{k}</span>
                <span className="font-medium tabular-nums">{q[k]}</span>
              </li>
            ))}
          </ul>
          <p className="mb-2 mt-4 text-xs font-medium">Duplicates</p>
          <ul className="space-y-1 text-xs">
            <li className="flex justify-between"><span className="text-ink-2">Exact (email, phone, name + company)</span><span className="font-medium tabular-nums">{summary.duplicates.exact}</span></li>
            <li className="flex justify-between"><span className="text-ink-2">Fuzzy (similar name, same company)</span><span className="font-medium tabular-nums">{summary.duplicates.fuzzy}</span></li>
            <li className="flex justify-between"><span className="text-ink-2">Flagged for review, not merged</span><span className="font-medium tabular-nums">{summary.duplicates.flaggedForReview}</span></li>
          </ul>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium">Checks (leads affected)</p>
          <ul className="space-y-1 text-xs">
            {checks.map(([label, n]) => (
              <li key={label} className="flex justify-between">
                <span className="text-ink-2">{label}</span>
                <span className="font-medium tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-panel p-3 text-xs ring-1 ring-line">
        <p className="font-medium">Your corrections</p>
        {corr.reviewed ? (
          <p className="mt-1 text-ink-2">
            {corr.reviewed} reviewed · {corr.agreed} agreed · {corr.falsePositives} false positive{corr.falsePositives === 1 ? "" : "s"} (scored Hot/Warm,
            you said no) · {corr.falseNegatives} false negative{corr.falseNegatives === 1 ? "" : "s"} (scored low, you said Hot/Warm)
          </p>
        ) : (
          <p className="mt-1 text-ink-2">Open any lead&apos;s details and set &ldquo;Should be&rdquo; to tell us where scoring got it wrong.</p>
        )}
        <p className="mt-1 text-[10px] text-ink-3">No accuracy percentage is shown: that needs verified ground-truth data, not a demo upload.</p>
      </div>
    </section>
  );
}
