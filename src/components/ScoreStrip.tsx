"use client";

// Every lead as a dot on a 0-100 score axis, colored by tier.
// Hover (or tap) a dot to see who it is.

import { useState } from "react";
import { tierColor } from "./ui";
import type { Tier } from "@/config/rubric";
import type { Row } from "@/lib/summary";
import type { ScoredLead } from "./types";

export function ScoreStrip({ rows }: { rows: Row[] }) {
  const [active, setActive] = useState<ScoredLead | null>(null);
  const tierOf = new Map<number, Tier>(rows.map((r) => [r.lead.id, r.flow.tier]));
  const leads = rows.map((r) => r.lead).sort((a, b) => b.score - a.score);

  // Stack dots that land in the same 3-point bucket so none hide each other.
  // Tall stacks (e.g. dozens of junk rows at 0) are capped and summarized as "+N".
  const MAX_LEVEL = 4;
  const stackCount = new Map<number, number>();
  const all = leads.map((l) => {
    const bucket = Math.round(l.score / 3);
    const level = stackCount.get(bucket) ?? 0;
    stackCount.set(bucket, level + 1);
    return { lead: l, level };
  });
  const dots = all.filter((d) => d.level < MAX_LEVEL);
  const overflow = [...stackCount.entries()]
    .filter(([, n]) => n > MAX_LEVEL)
    .map(([bucket, n]) => ({ left: Math.min(100, bucket * 3), extra: n - MAX_LEVEL }));
  const top = leads[0];

  return (
    <div className="card relative px-5 pb-3 pt-4">
      <div className="mb-1 flex items-center justify-between text-[10px] text-ink-3">
        <span>Score distribution</span>
        {top && (
          <span className="rounded-full bg-white px-3 py-1 text-[11px] text-ink shadow-sm ring-1 ring-line">
            ↗ Top lead scores <b className="font-semibold">{top.score}</b>
          </span>
        )}
      </div>
      <div className="relative h-20" onMouseLeave={() => setActive(null)}>
        <div className="absolute inset-x-0 bottom-3 h-px bg-ink/10" />
        {dots.map(({ lead, level }) => (
          <button
            key={lead.id}
            aria-label={`${lead.firstName} ${lead.lastName}, score ${lead.score}, ${tierOf.get(lead.id)}`}
            onMouseEnter={() => setActive(lead)}
            onFocus={() => setActive(lead)}
            onClick={() => setActive(lead)}
            className="absolute -translate-x-1/2 p-1"
            style={{ left: `${lead.score}%`, bottom: `${8 + level * 11}px` }}
          >
            <span
              className="block size-2.5 rounded-full ring-2 ring-white transition-transform hover:scale-150"
              style={{ background: tierColor[tierOf.get(lead.id)!] }}
            />
          </button>
        ))}
        {overflow.map((o) => (
          <span
            key={o.left}
            className="absolute -translate-x-1/2 text-[9px] font-medium text-ink-3"
            style={{ left: `${o.left}%`, bottom: `${10 + MAX_LEVEL * 11}px` }}
          >
            +{o.extra}
          </span>
        ))}
        {active && (
          <div
            className="pointer-events-none absolute bottom-full z-10 mb-1 w-max max-w-56 -translate-x-1/2 rounded-xl bg-ink px-3 py-2 text-[11px] text-white shadow-lg"
            style={{ left: `clamp(80px, ${active.score}%, calc(100% - 80px))` }}
          >
            <div className="font-medium">
              {active.firstName} {active.lastName} · {active.company || "No company"}
            </div>
            <div className="text-white/70">
              Score {active.score} · {tierOf.get(active.id)}
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-between text-[10px] text-ink-3">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
    </div>
  );
}
