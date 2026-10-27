"use client";

// Progress screen while the API works. Early steps advance on a timer; the
// scoring step waits for the real response, then each step shows the real counts.

import { useEffect, useState } from "react";
import { Logo } from "./ui";
import type { ScoreResponse } from "./types";

const STEP_MS = 650;

export function Thinking({
  fileName,
  rowCount,
  result,
  onDone,
}: {
  fileName: string;
  rowCount: number;
  result: ScoreResponse | null;
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);

  // Walk through parse, clean and dedupe, then hold on "Scoring" until the response lands.
  useEffect(() => {
    if (step < 3) {
      const t = setTimeout(() => setStep((s) => s + 1), STEP_MS);
      return () => clearTimeout(t);
    }
    if (result && step < 5) {
      const t = setTimeout(() => setStep((s) => s + 1), STEP_MS);
      return () => clearTimeout(t);
    }
    if (step === 5) {
      const t = setTimeout(onDone, 500);
      return () => clearTimeout(t);
    }
  }, [step, result, onDone]);

  const k = result?.kpis;
  const scored = result && k ? result.leads.length - k.junkFlagged : 0;
  // `done` is the real count, shown only once the step is checked off.
  const steps = [
    { label: "Reading your file", working: "Counting rows", done: `${rowCount} rows found` },
    { label: "Cleaning and normalizing", working: "Fixing casing, cities, countries", done: k && `${k.junkFlagged} junk rows flagged` },
    { label: "Merging duplicates", working: "Matching by email", done: k && `${k.duplicatesRemoved} duplicates merged` },
    { label: "Scoring with Claude", working: "Reading titles, company fit and intent", done: k && `${scored} leads scored against the rubric` },
    { label: "Routing through the Flow", working: "Assigning queues and tasks", done: k && `${k.hot} hot leads sent to AE queues` },
  ];
  const progress = Math.min(100, (step / steps.length) * 100 + (step === 3 && !result ? 8 : 0));

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-page" role="status" aria-live="polite">
      <header className="px-5 py-5 sm:px-10">
        <Logo />
      </header>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="card rise w-full max-w-lg p-7 sm:p-10">
          <div className="flex items-center gap-4">
            <span aria-hidden className="orb size-12 shrink-0 rounded-full" />
            <div className="min-w-0">
              <p className="font-display text-2xl font-medium tracking-tight">Analyzing your leads</p>
              <p className="truncate text-xs text-ink-3">{fileName}</p>
            </div>
          </div>

          <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-ink/5">
            <div className="h-full rounded-full bg-gradient-to-r from-iris to-ember transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>

          <ol className="mt-6 space-y-4">
            {steps.map((s, i) => {
              const state = i < step ? "done" : i === step ? "active" : "pending";
              return (
                <li key={s.label} className={`flex items-start gap-3 transition-opacity ${state === "pending" ? "opacity-35" : ""}`}>
                  <span
                    aria-hidden
                    className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[10px] ${
                      state === "done" ? "bg-ink text-white" : state === "active" ? "ring-2 ring-iris" : "ring-1 ring-ink/20"
                    }`}
                  >
                    {state === "done" ? "✓" : state === "active" ? <span className="size-1.5 animate-ping rounded-full bg-iris" /> : ""}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{s.label}</p>
                    <p className="text-xs text-ink-3">{state === "done" && s.done ? s.done : s.working}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
