"use client";

// Tier mix (one stacked bar + legend with counts) and leads by region (bars).

import { useState } from "react";
import type { Tier } from "@/config/rubric";
import { TIERS, tierColor } from "./ui";
import type { ScoredLead } from "./types";

function count<T extends string>(items: T[]) {
  const m = new Map<T, number>();
  for (const i of items) m.set(i, (m.get(i) ?? 0) + 1);
  return m;
}

export function Breakdown({ leads }: { leads: ScoredLead[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const total = leads.length || 1;
  const tiers = count<Tier>(leads.map((l) => l.tier));
  const regions = [...count(leads.map((l) => l.region)).entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const segments = [...count(leads.map((l) => l.segment)).entries()].sort((a, b) => b[1] - a[1]);
  const maxRegion = Math.max(1, ...regions.map((r) => r[1]));

  return (
    <div className="card grid gap-6 p-5 sm:grid-cols-2">
      <div>
        <h3 className="mb-3 text-sm font-medium">Tier mix</h3>
        <div className="flex h-3 gap-[2px] overflow-hidden rounded-full">
          {TIERS.filter((t) => tiers.get(t)).map((t) => (
            <div
              key={t}
              title={`${t}: ${tiers.get(t)}`}
              onMouseEnter={() => setHover(t)}
              onMouseLeave={() => setHover(null)}
              className="h-full transition-opacity"
              style={{
                width: `${((tiers.get(t) ?? 0) / total) * 100}%`,
                background: tierColor[t],
                opacity: hover && hover !== t ? 0.35 : 1,
              }}
            />
          ))}
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
          {TIERS.map((t) => (
            <li key={t} className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-ink-2">
                <span className="size-2 rounded-full" style={{ background: tierColor[t] }} />
                {t}
              </span>
              <span className="font-medium tabular-nums">{tiers.get(t) ?? 0}</span>
            </li>
          ))}
        </ul>
        <h3 className="mb-2 mt-5 text-sm font-medium">Segment</h3>
        <ul className="space-y-1">
          {segments.map(([s, n]) => (
            <li key={s} className="flex justify-between text-[11px]">
              <span className="text-ink-2">{s}</span>
              <span className="font-medium tabular-nums">{n}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-medium">Leads by region</h3>
        <ul className="space-y-2.5">
          {regions.map(([r, n]) => (
            <li key={r} title={`${r}: ${n}`}>
              <div className="mb-1 flex justify-between text-[11px]">
                <span className="text-ink-2">{r}</span>
                <span className="font-medium tabular-nums">{n}</span>
              </div>
              <div className="h-2 rounded-full bg-ink/5">
                <div className="h-full rounded-full bg-ink/80" style={{ width: `${(n / maxRegion) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
