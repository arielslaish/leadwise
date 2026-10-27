"use client";

// Salesforce-style record-triggered Flow, simulated in the browser.
// The two variables are the ones an admin would expose in Flow Builder.

import type { FlowOutcome, FlowVariables } from "@/lib/flow";

const STEPS = ["Lead created", "Decision: tier", "Assign queue", "Create task"];

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

  return (
    <div className="card flex h-full flex-col gap-4 p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium">Routing flow</h3>
          <p className="text-[11px] text-ink-3">Record-triggered Flow on Lead, after save</p>
        </div>
        <span className="rounded-full bg-[#00a1e0]/10 px-2 py-0.5 text-[10px] font-medium text-[#0070a8]">Salesforce</span>
      </div>

      <ol className="flex flex-wrap items-center gap-1 text-[10px] text-ink-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-1">
            <span className="whitespace-nowrap rounded-full bg-white px-2 py-1 ring-1 ring-line">{s}</span>
            {i < STEPS.length - 1 && <span className="text-ink-3">→</span>}
          </li>
        ))}
      </ol>

      <label className="block">
        <div className="flex justify-between text-[11px]">
          <span className="text-ink-2">Hot threshold</span>
          <span className="font-medium">{vars.hotThreshold}+</span>
        </div>
        <input
          type="range"
          min={50}
          max={95}
          step={5}
          value={vars.hotThreshold}
          onChange={(e) => onChange({ ...vars, hotThreshold: Number(e.target.value) })}
          className="w-full"
        />
      </label>
      <label className="block">
        <div className="flex justify-between text-[11px]">
          <span className="text-ink-2">Hot lead first-call SLA</span>
          <span className="font-medium">
            {vars.hotTaskDueDays === 0 ? "Same day" : `${vars.hotTaskDueDays} day${vars.hotTaskDueDays > 1 ? "s" : ""}`}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={5}
          value={vars.hotTaskDueDays}
          onChange={(e) => onChange({ ...vars, hotTaskDueDays: Number(e.target.value) })}
          className="w-full"
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
