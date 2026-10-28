"use client";

// "What does Hot mean to you?" A lead is Hot when its score clears the threshold
// OR it matches every condition the user sets here. Counts update live.

import type { ImportSummary } from "@/lib/clean";
import { flowContext, HOT_ACTIONS, matchHotRules, type HotAction, type HotRules } from "@/lib/flow";
import type { Row } from "@/lib/summary";

const RECENCY = [null, 2, 3, 7, 14, 30] as const;
const VALUES = [null, 250, 500, 1000, 2000] as const;

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function Seg<T extends string | number | null>({
  options,
  value,
  label,
  onChange,
  disabled,
}: {
  options: readonly T[];
  value: T;
  label: (v: T) => string;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${disabled ? "pointer-events-none opacity-40" : ""}`}>
      {options.map((o) => (
        <button
          key={String(o)}
          onClick={() => onChange(o)}
          className={`rounded-full px-3 py-1.5 text-[11px] ring-1 transition ${
            value === o ? "bg-ink text-white ring-ink" : "bg-white text-ink-2 ring-line hover:bg-white/70"
          }`}
        >
          {label(o)}
        </button>
      ))}
    </div>
  );
}

export function HotRulesCard({
  rules,
  onChange,
  rows,
  imp,
  hotThreshold,
}: {
  rules: HotRules;
  onChange: (r: HotRules) => void;
  rows: Row[];
  imp: ImportSummary;
  hotThreshold: number;
}) {
  const set = (patch: Partial<HotRules>) => onChange({ ...rules, ...patch });
  const valid = rows.filter((r) => r.lead.quality !== "Invalid" && !r.lead.notInterested);
  const ctx = flowContext(valid.map((r) => r.lead), rules);
  const matching = valid.filter((r) => matchHotRules(r.lead, { ...rules, enabled: true }, ctx)).length;
  const byScore = valid.filter((r) => r.lead.score >= hotThreshold).length;
  const countOf = (a: HotAction) => valid.filter((r) => r.lead.actions.includes(a)).length;
  const toggleAction = (a: HotAction) =>
    set({ actions: rules.actions.includes(a) ? rules.actions.filter((x) => x !== a) : [...rules.actions, a] });

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h3 className="font-display text-lg font-medium">What counts as Hot for you?</h3>
          <p className="mt-0.5 max-w-xl text-xs text-ink-3">
            A lead is Hot when its score is {hotThreshold}+ <span className="font-medium text-ink-2">or</span> it matches every condition you set
            below. Every number on this page, the CSV and the PDF follow your definition.
          </p>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full bg-white px-3 py-2 text-xs ring-1 ring-line">
          <input type="checkbox" checked={rules.enabled} onChange={(e) => set({ enabled: e.target.checked })} className="size-4 accent-brand" />
          Use my Hot rules
        </label>
      </div>

      <div className={`mt-5 grid gap-6 lg:grid-cols-[1.4fr_1fr_auto] ${rules.enabled ? "" : "opacity-50"}`}>
        <div>
          <p className="mb-2 text-xs font-medium">The lead did any of these</p>
          <div className="flex flex-wrap gap-1.5">
            {HOT_ACTIONS.map((a) => {
              const on = rules.actions.includes(a);
              const n = countOf(a);
              return (
                <button
                  key={a}
                  onClick={() => toggleAction(a)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] ring-1 transition ${
                    on ? "bg-brand-soft text-brand ring-brand/40" : "bg-white text-ink-2 ring-line hover:bg-white/70"
                  } ${n ? "" : "opacity-50"}`}
                >
                  <span aria-hidden>{on ? "✓" : "+"}</span>
                  {a}
                  <span className="tabular-nums text-ink-3">{n}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] text-ink-3">Signals come from the notes (read by Claude), the status column and the lead source.</p>
        </div>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium">Last touch within</p>
            <Seg
              options={RECENCY}
              value={rules.withinDays as (typeof RECENCY)[number]}
              label={(v) => (v == null ? "Any time" : `${v} days`)}
              onChange={(v) => set({ withinDays: v })}
              disabled={!imp.hasActivityDates}
            />
            {imp.hasActivityDates ? (
              <div className="mt-2 flex gap-1.5 text-[10px]">
                {[true, false].map((fromNewest) => (
                  <button
                    key={String(fromNewest)}
                    onClick={() => set({ fromNewestDate: fromNewest })}
                    className={`rounded-full px-2 py-1 ${rules.fromNewestDate === fromNewest ? "bg-ink/10 text-ink" : "text-ink-3"}`}
                  >
                    {fromNewest ? `counted from the newest date in your file${ctx.referenceDate && rules.fromNewestDate ? ` (${fmtDate(ctx.referenceDate)})` : ""}` : "counted from today"}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-[10px] text-ink-3">Your file has no activity date column, so recency is ignored.</p>
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-medium">Deal value at least</p>
            <Seg
              options={VALUES}
              value={rules.minValue as (typeof VALUES)[number]}
              label={(v) => (v == null ? "Any" : v.toLocaleString("en-US"))}
              onChange={(v) => set({ minValue: v })}
              disabled={!imp.hasDealValues}
            />
            {!imp.hasDealValues && <p className="mt-2 text-[10px] text-ink-3">No value or spend column found.</p>}
          </div>
        </div>

        <div className="flex gap-3 lg:flex-col">
          <div className="grad-forest flex-1 rounded-2xl p-4 text-white">
            <div className="font-display text-4xl font-medium leading-none">{matching}</div>
            <div className="mt-1 text-[11px] text-white/85">match your rules</div>
          </div>
          <div className="flex-1 rounded-2xl bg-white/70 p-4 ring-1 ring-line">
            <div className="font-display text-4xl font-medium leading-none">{byScore}</div>
            <div className="mt-1 text-[11px] text-ink-2">score {hotThreshold}+</div>
          </div>
        </div>
      </div>

      {imp.missingColumns.length > 0 && (
        <p className="mt-4 rounded-xl bg-panel px-3 py-2 text-[11px] text-ink-2 ring-1 ring-line">
          Your file has no {imp.missingColumns.join(" or ").toLowerCase()} column, so {imp.missingColumns.length > 1 ? "those criteria are" : "that criterion is"} left out
          of the score and the rest are rescaled to 100, instead of costing every lead points.
        </p>
      )}
    </section>
  );
}
