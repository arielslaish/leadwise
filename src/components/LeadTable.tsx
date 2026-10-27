"use client";

// Ranked leads with Claude's reasoning. Table on desktop, stacked cards on mobile.

import type { FlowOutcome } from "@/lib/flow";
import { TierChip, tierColor } from "./ui";
import type { ScoredLead } from "./types";

type Row = { lead: ScoredLead; flow: FlowOutcome };

function ScoreBar({ lead }: { lead: ScoredLead }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-6 text-right text-xs font-medium tabular-nums">{lead.score}</span>
      <div className="h-1.5 w-16 rounded-full bg-ink/5">
        <div className="h-full rounded-full" style={{ width: `${lead.score}%`, background: tierColor[lead.tier] }} />
      </div>
    </div>
  );
}

export function LeadTable({ rows }: { rows: Row[] }) {
  if (!rows.length) return <p className="py-10 text-center text-sm text-ink-3">No leads in this view.</p>;

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
              <th className="py-3 font-medium">Routed to</th>
              <th className="py-3 pr-2 font-medium">Why</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ lead, flow }, i) => (
              <tr key={lead.id} className="border-t border-line align-top">
                <td className="py-3 pl-2 text-ink-3 tabular-nums">{i + 1}</td>
                <td className="py-3 pr-3">
                  <div className="font-medium">
                    {lead.firstName} {lead.lastName}
                  </div>
                  <div className="text-ink-3">{lead.title || "No title"}</div>
                </td>
                <td className="py-3 pr-3">
                  <div>{lead.company || "-"}</div>
                  <div className="text-ink-3">
                    {lead.segment} · {lead.region}
                  </div>
                </td>
                <td className="py-3 pr-3">
                  <ScoreBar lead={lead} />
                </td>
                <td className="py-3 pr-3">
                  <TierChip tier={lead.tier} />
                </td>
                <td className="py-3 pr-3">
                  <div>{flow.owner}</div>
                  {flow.task && (
                    <div className="text-ink-3">
                      Task due {flow.task.dueInDays === 0 ? "today" : `in ${flow.task.dueInDays}d`}
                    </div>
                  )}
                </td>
                <td className="max-w-72 py-3 pr-2 text-ink-2">{lead.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="max-h-[70vh] space-y-3 overflow-y-auto lg:hidden">
        {rows.map(({ lead, flow }, i) => (
          <li key={lead.id} className="rounded-2xl bg-white/70 p-4 ring-1 ring-line">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium">
                  <span className="mr-1.5 text-ink-3">{i + 1}</span>
                  {lead.firstName} {lead.lastName}
                </div>
                <div className="text-xs text-ink-3">
                  {lead.title || "No title"} · {lead.company || "-"}
                </div>
              </div>
              <TierChip tier={lead.tier} />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <ScoreBar lead={lead} />
              <span className="text-[11px] text-ink-2">→ {flow.owner}</span>
            </div>
            <p className="mt-2 text-xs text-ink-2">{lead.reason}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
