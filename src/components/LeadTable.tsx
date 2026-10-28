"use client";

// Ranked leads. Click a row for the full explanation: score breakdown, every
// data issue, merged records, the routing decision, and a correction control.
// Table on desktop, stacked cards on mobile; both scroll inside a fixed box.

import { Fragment, useState } from "react";
import { TIER_ORDER, type Tier } from "@/config/rubric";
import type { DataQuality } from "@/lib/clean";
import type { Row } from "@/lib/summary";
import { TierChip, tierColor } from "./ui";

const QUALITY_STYLE: Record<DataQuality, string> = {
  Valid: "bg-brand-soft text-brand",
  "Needs review": "bg-warm/15 text-[#8a5d00]",
  Invalid: "bg-hot/10 text-hot",
};

function QualityBadge({ q }: { q: DataQuality }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ${QUALITY_STYLE[q]}`}>{q}</span>;
}

function ScoreBar({ row }: { row: Row }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-6 text-right text-xs font-medium tabular-nums">{row.lead.score}</span>
      <div className="h-1.5 w-14 rounded-full bg-ink/5">
        <div className="h-full rounded-full" style={{ width: `${row.lead.score}%`, background: tierColor[row.flow.tier] }} />
      </div>
    </div>
  );
}

function Details({ row, onCorrect }: { row: Row; onCorrect: (id: number, t: Tier | null) => void }) {
  const { lead, flow, correction } = row;
  return (
    <div className="grid gap-4 rounded-2xl bg-panel p-4 text-xs ring-1 ring-line md:grid-cols-3">
      <div>
        <p className="mb-2 font-medium">Why this score: {lead.score}/100</p>
        <ul className="space-y-1">
          {lead.breakdown.map((b) => (
            <li key={b.criterion} className="flex justify-between gap-3">
              <span className="text-ink-2">
                {b.criterion} <span className="text-ink-3">· {b.value}</span>
              </span>
              <span className="tabular-nums">
                {b.points}/{b.max}
              </span>
            </li>
          ))}
        </ul>
        {lead.intentEvidence && <p className="mt-2 text-ink-3">Signal: &ldquo;{lead.intentEvidence}&rdquo;</p>}
        <p className="mt-1 text-[10px] text-ink-3">
          {lead.scoredBy === "claude" ? "Labels by Claude, points by the rubric" : lead.scoredBy === "rules" ? "Labels by rules, points by the rubric" : "Not sent to AI: invalid record"}
        </p>
      </div>
      <div>
        <p className="mb-2 font-medium">Data quality: {lead.quality}</p>
        {lead.issues.length ? (
          <ul className="space-y-1">
            {lead.issues.map((i) => (
              <li key={i.code} className={i.severity === "error" ? "text-hot" : "text-ink-2"}>
                {i.severity === "error" ? "✕" : "!"} {i.label}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-3">No issues found.</p>
        )}
        {(lead.merged.length > 0 || lead.possibleDuplicateRows.length > 0) && (
          <div className="mt-3">
            <p className="mb-1 font-medium">Duplicates</p>
            <ul className="space-y-1 text-ink-2">
              {lead.merged.map((m) => (
                <li key={m.rowNumber}>
                  Merged row {m.rowNumber} ({m.name || m.email || "no name"}): {m.matchedOn.toLowerCase()}
                </li>
              ))}
              {lead.possibleDuplicateRows.map((r) => (
                <li key={r} className="text-[#8a5d00]">Possible duplicate of row {r}, not merged: please review</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div>
        <p className="mb-2 font-medium">Routing</p>
        <p className="text-ink-2">{flow.why}</p>
        <p className="mt-2 text-ink-3">
          Queue: {flow.owner}
          <br />
          Task: {flow.taskLabel}
        </p>
        <label className="mt-3 flex items-center gap-2">
          <span className="text-ink-3">Should be</span>
          <select
            value={correction ?? ""}
            onChange={(e) => onCorrect(lead.id, (e.target.value || null) as Tier | null)}
            className="rounded-full bg-white px-2 py-1 ring-1 ring-line"
          >
            <option value="">{flow.tier} (as scored)</option>
            {TIER_ORDER.filter((t) => t !== flow.tier).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

export function LeadTable({ rows, onCorrect }: { rows: Row[]; onCorrect: (id: number, t: Tier | null) => void }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!rows.length) return <p className="py-10 text-center text-sm text-ink-3">No leads in this view.</p>;
  const toggle = (id: number) => setOpen((o) => (o === id ? null : id));

  return (
    <>
      <div className="hidden max-h-[620px] overflow-auto rounded-2xl lg:block">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 z-10 bg-panel text-[10px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="py-3 pl-2 font-medium">#</th>
              <th className="py-3 font-medium">Lead</th>
              <th className="py-3 font-medium">Company</th>
              <th className="py-3 font-medium">Score</th>
              <th className="py-3 font-medium">Tier</th>
              <th className="py-3 font-medium">Data</th>
              <th className="py-3 font-medium">Routed to</th>
              <th className="py-3 pr-2 font-medium">Why</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const { lead, flow } = row;
              return (
                <Fragment key={lead.id}>
                  <tr onClick={() => toggle(lead.id)} className="cursor-pointer border-t border-line align-top hover:bg-white/60">
                    <td className="py-3 pl-2 text-ink-3 tabular-nums">{i + 1}</td>
                    <td className="py-3 pr-3">
                      <div className="font-medium">
                        {lead.firstName || lead.lastName ? `${lead.firstName} ${lead.lastName}` : "Name unavailable"}
                        {lead.merged.length > 0 && (
                          <span className="ml-1.5 rounded-full bg-ink/5 px-1.5 py-0.5 text-[9px] font-normal text-ink-2">+{lead.merged.length} merged</span>
                        )}
                      </div>
                      <div className="text-ink-3">{lead.title || "Title unavailable"}</div>
                    </td>
                    <td className="py-3 pr-3">
                      <div>{lead.company || "Unavailable"}</div>
                      <div className="text-ink-3">
                        {lead.segment} · {lead.region}
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <ScoreBar row={row} />
                    </td>
                    <td className="py-3 pr-3">
                      <TierChip tier={flow.tier} />
                      {row.correction && <div className="mt-1 text-[10px] text-ink-3">You: {row.correction}</div>}
                    </td>
                    <td className="py-3 pr-3">
                      <QualityBadge q={lead.quality} />
                      {lead.issues.length > 0 && <div className="mt-1 text-[10px] text-ink-3">{lead.issues.length} issue{lead.issues.length > 1 ? "s" : ""}</div>}
                    </td>
                    <td className="py-3 pr-3">
                      <div>{flow.owner}</div>
                      <div className="text-ink-3">{flow.task ? `Task due ${flow.task.dueInDays === 0 ? "today" : `in ${flow.task.dueInDays}d`}` : "No task"}</div>
                    </td>
                    <td className="max-w-64 py-3 pr-2 text-ink-2">
                      {lead.reason}
                      <div className="mt-1 text-[10px] text-brand">{open === lead.id ? "Hide details" : "Details"}</div>
                    </td>
                  </tr>
                  {open === lead.id && (
                    <tr>
                      <td colSpan={8} className="pb-3">
                        <Details row={row} onCorrect={onCorrect} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="max-h-[70vh] space-y-3 overflow-y-auto lg:hidden">
        {rows.map((row, i) => {
          const { lead, flow } = row;
          return (
            <li key={lead.id} className="rounded-2xl bg-white/70 p-4 ring-1 ring-line">
              <button className="w-full text-left" onClick={() => toggle(lead.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">
                      <span className="mr-1.5 text-ink-3">{i + 1}</span>
                      {lead.firstName || lead.lastName ? `${lead.firstName} ${lead.lastName}` : "Name unavailable"}
                    </div>
                    <div className="text-xs text-ink-3">
                      {lead.title || "Title unavailable"} · {lead.company || "Company unavailable"}
                    </div>
                  </div>
                  <TierChip tier={flow.tier} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <ScoreBar row={row} />
                  <QualityBadge q={lead.quality} />
                </div>
                <p className="mt-2 text-xs text-ink-2">{lead.reason}</p>
                <p className="mt-1 text-[11px] text-ink-3">
                  {flow.owner} · <span className="text-brand">{open === lead.id ? "Hide details" : "Details"}</span>
                </p>
              </button>
              {open === lead.id && (
                <div className="mt-3">
                  <Details row={row} onCorrect={onCorrect} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
