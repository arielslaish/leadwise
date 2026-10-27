"use client";

// Salesforce-style record-triggered Flow, simulated in the browser.
// These are the variables an admin would expose as Flow constants.

import { defaultFlowVariables, type FlowOutcome, type FlowVariables } from "@/lib/flow";

const STEPS = ["Lead created", "Decision: score", "Assign queue", "Create task"];

const days = (n: number) => (n === 0 ? "Same day" : `${n} day${n > 1 ? "s" : ""}`);

function Slider({
  label,
  value,
  display,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step?: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex justify-between gap-2 text-[11px]">
        <span className="text-ink-2">{label}</span>
        <span className="font-medium tabular-nums">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </label>
  );
}

export function FlowCard({
  vars,
  onChange,
  outcomes,
}: {
  vars: FlowVariables;
  onChange: (v: FlowVariables) => void;
  outcomes: FlowOutcome[];
}) {
  const byOwner = new Map<string, number>();
  for (const o of outcomes) byOwner.set(o.owner, (byOwner.get(o.owner) ?? 0) + 1);
  const tasks = outcomes.filter((o) => o.task).length;
  const owners = [...byOwner.entries()].sort((a, b) => b[1] - a[1]);
  const set = (patch: Partial<FlowVariables>) => onChange({ ...vars, ...patch });
  const changed = JSON.stringify(vars) !== JSON.stringify(defaultFlowVariables);

  return (
    <div className="card flex h-full flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-base font-medium">Routing flow</h3>
          <p className="text-[11px] text-ink-3">Record-triggered Flow on Lead · tune it live</p>
        </div>
        <div className="flex items-center gap-2">
          {changed && (
            <button onClick={() => onChange(defaultFlowVariables)} className="text-[10px] text-ink-3 underline underline-offset-2">
              Reset
            </button>
          )}
          <span className="rounded-full bg-[#00a1e0]/10 px-2 py-0.5 text-[10px] font-medium text-[#0070a8]">Salesforce</span>
        </div>
      </div>

      <ol className="flex flex-wrap items-center gap-1 text-[10px] text-ink-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-1">
            <span className="whitespace-nowrap rounded-full bg-white px-2 py-1 ring-1 ring-line">{s}</span>
            {i < STEPS.length - 1 && <span className="text-ink-3">→</span>}
          </li>
        ))}
      </ol>

      <div className="grid grid-cols-2 gap-x-5 gap-y-3">
        <Slider
          label="Hot threshold"
          value={vars.hotThreshold}
          display={`${vars.hotThreshold}+`}
          min={50}
          max={95}
          step={5}
          onChange={(n) => set({ hotThreshold: n, warmThreshold: Math.min(vars.warmThreshold, n - 5) })}
        />
        <Slider
          label="Hot call SLA"
          value={vars.hotTaskDueDays}
          display={days(vars.hotTaskDueDays)}
          min={0}
          max={5}
          onChange={(n) => set({ hotTaskDueDays: n })}
        />
        <Slider
          label="Warm threshold"
          value={vars.warmThreshold}
          display={`${vars.warmThreshold}+`}
          min={30}
          max={vars.hotThreshold - 5}
          step={5}
          onChange={(n) => set({ warmThreshold: n })}
        />
        <Slider
          label="Warm follow-up"
          value={vars.warmTaskDueDays}
          display={days(vars.warmTaskDueDays)}
          min={1}
          max={10}
          onChange={(n) => set({ warmTaskDueDays: n })}
        />
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-white/70 px-3 py-2.5 text-[11px] ring-1 ring-line">
        <span className="text-ink-2">Hot Enterprise accounts go to Strategic AEs</span>
        <input
          type="checkbox"
          checked={vars.enterpriseToStrategic}
          onChange={(e) => set({ enterpriseToStrategic: e.target.checked })}
          className="size-4 accent-iris"
        />
      </label>

      <div className="mt-auto space-y-1.5 border-t border-line pt-3">
        {owners.map(([owner, n]) => (
          <div key={owner} className="flex justify-between text-[11px]">
            <span className="text-ink-2">{owner}</span>
            <span className="font-medium tabular-nums">{n}</span>
          </div>
        ))}
        <div className="flex justify-between pt-1 text-[11px]">
          <span className="text-ink-2">Follow-up tasks created</span>
          <span className="font-medium tabular-nums">{tasks}</span>
        </div>
      </div>
    </div>
  );
}
