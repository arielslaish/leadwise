"use client";

// Home page as a story: the problem, the fix (try it), how it works, and who built it.

import { useRef, useState } from "react";
import { MAX_ROWS, rubric } from "@/config/rubric";
import { HireMe } from "./HireMe";
import { Footer, GITHUB_URL, LINKEDIN_URL, Logo, TierChip } from "./ui";

const PROBLEMS = [
  {
    problem: "Stale, duplicated data",
    pain: "The same lead three times, \"TLV\" next to \"Tel Aviv\", test rows nobody deleted.",
    fix: "Normalized, deduplicated and junk-flagged before anyone looks at it.",
  },
  {
    problem: "Gut-feel prioritization",
    pain: "Reps pick leads by job title and hope. The best accounts wait in the pile.",
    fix: "Every lead scored 0-100 by AI against a clear rubric, with the reason in one line.",
  },
  {
    problem: "Leads with no owner",
    pain: "Hot inbound sits unassigned for days while SDRs and AEs argue over it.",
    fix: "Routed to the right queue with a follow-up task and an SLA, like a Salesforce Flow.",
  },
];

const STEPS = [
  ["Parse", "Maps any export's columns"],
  ["Clean", "Fixes, merges, flags junk"],
  ["Score", "Claude rates fit and intent"],
  ["Route", "Queue, owner, task, SLA"],
];

// Colors for the six rubric slices, in order (a stacked bar of the 100 points).
const SLICE = ["#5b3df5", "#7c5cff", "#a78bfa", "#ff8a65", "#ff5e3a", "#c7c2dc"];

export function Home({ onSample, onFile, error }: { onSample: () => void; onFile: (f: File) => void; error: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const criteria: [string, number][] = [
    [rubric.companySize.label, rubric.companySize.weight],
    [rubric.seniority.label, rubric.seniority.weight],
    [rubric.industry.label, rubric.industry.weight],
    [rubric.intent.label, rubric.intent.weight],
    [rubric.region.label, rubric.region.weight],
    [rubric.completeness.label, rubric.completeness.weight],
  ];

  return (
    <div className="min-h-dvh">
      <nav className="sticky top-0 z-30 border-b border-line bg-page/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3 sm:px-8">
          <Logo />
          <div className="flex items-center gap-1 text-xs text-ink-2 sm:gap-2">
            <a href="#problem" className="hidden rounded-full px-3 py-2 hover:bg-white md:block">The problem</a>
            <a href="#how" className="hidden rounded-full px-3 py-2 hover:bg-white md:block">How it works</a>
            <a href="#about" className="hidden rounded-full px-3 py-2 hover:bg-white md:block">About me</a>
            <a href={LINKEDIN_URL} target="_blank" rel="noreferrer" className="rounded-full bg-ink px-4 py-2 text-white">
              Hire me
            </a>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-[1400px] space-y-14 px-4 pb-4 pt-8 sm:space-y-20 sm:px-8 sm:pt-14">
        {/* Hero: the problem, then the two ways to see the fix */}
        <section>
          <div className="rise grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-end">
            <div>
              <span className="rounded-full bg-iris-soft px-3 py-1 text-[11px] font-medium text-iris">
                A working demo by Ariel Laish
              </span>
              <h1 className="mt-4 font-display text-4xl font-medium leading-[1.04] tracking-tight sm:text-6xl">
                Your reps are calling the{" "}
                <span className="font-serif font-normal italic text-iris">wrong</span> leads.
              </h1>
            </div>
            <p className="max-w-lg text-sm leading-relaxed text-ink-2 sm:text-base lg:pb-2">
              Stale, duplicated, unscored lists quietly cost pipeline every week. Leadwise shows how I fix that: drop in a
              list and get it cleaned, scored by AI and routed like Salesforce, in seconds.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <button
              onClick={onSample}
              className="grad-iris group flex min-h-56 flex-col justify-between rounded-[28px] p-6 text-left text-white transition hover:-translate-y-0.5 hover:shadow-2xl sm:p-8"
            >
              <span className="w-fit rounded-full bg-white/20 px-3 py-1 text-[11px] font-medium ring-1 ring-white/30">
                One click · no file needed
              </span>
              <div>
                <h2 className="font-display text-3xl font-medium tracking-tight">Run the sample list</h2>
                <p className="mt-1.5 max-w-sm text-sm text-white/85">40 messy, fictional leads: duplicates, test junk and all.</p>
                <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-ink transition group-hover:gap-3">
                  Score sample leads →
                </span>
              </div>
            </button>

            <div
              role="button"
              tabIndex={0}
              onClick={() => input.current?.click()}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files[0];
                if (f) onFile(f);
              }}
              className={`card flex min-h-56 cursor-pointer items-center gap-5 p-6 transition hover:-translate-y-0.5 sm:p-8 ${
                dragging ? "ring-2 ring-iris" : ""
              }`}
            >
              <div className="flex w-full flex-col items-center rounded-3xl border-2 border-dashed border-ink/10 p-6 text-center">
                <span aria-hidden className="grid size-11 place-items-center rounded-2xl bg-ink text-lg text-white">↑</span>
                <h2 className="mt-3 font-display text-2xl font-medium tracking-tight sm:text-3xl">Upload your lead list</h2>
                <p className="mt-1 text-sm text-ink-2">
                  Drop a CSV or <span className="font-medium text-iris underline underline-offset-4">browse</span>
                </p>
                <p className="mt-2 text-[11px] text-ink-3">Any export · first {MAX_ROWS} rows scored · never stored</p>
              </div>
              <input
                ref={input}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          {error && (
            <div role="alert" className="mt-4 rounded-2xl bg-hot/10 px-4 py-3 text-sm text-hot">
              {error}
            </div>
          )}
        </section>

        {/* Problem → fix */}
        <section id="problem" className="scroll-mt-20">
          <h2 className="font-display text-3xl font-medium tracking-tight">Sound familiar?</h2>
          <p className="mt-1 text-sm text-ink-2">Three problems every revenue team has, and how Leadwise handles each one.</p>
          <div className="mt-6 grid gap-3 lg:grid-cols-3">
            {PROBLEMS.map((p) => (
              <div key={p.problem} className="card flex flex-col p-6">
                <p className="text-[11px] font-medium uppercase tracking-wide text-hot">The problem</p>
                <p className="mt-1 font-display text-xl font-medium">{p.problem}</p>
                <p className="mt-1.5 text-sm text-ink-2">{p.pain}</p>
                <div className="mt-5 rounded-2xl bg-iris-soft p-4">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-iris">The fix</p>
                  <p className="mt-1 text-sm text-ink">{p.fix}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works: steps, rubric and routing, kept compact */}
        <section id="how" className="scroll-mt-20">
          <h2 className="font-display text-3xl font-medium tracking-tight">How it works</h2>
          <p className="mt-1 text-sm text-ink-2">Four steps, one upload. The AI makes the judgment calls; the rules stay visible.</p>

          <ol className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="card flex items-center gap-3 p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-iris-soft font-display text-sm font-semibold text-iris">
                  {i + 1}
                </span>
                <span>
                  <span className="block font-display text-base font-medium">{t}</span>
                  <span className="block text-[11px] leading-snug text-ink-3">{d}</span>
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="card p-6">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display text-xl font-medium">The scoring rubric</h3>
                <span className="text-[11px] text-ink-3">100 points</span>
              </div>
              <div className="mt-4 flex h-3 gap-[2px] overflow-hidden rounded-full">
                {criteria.map(([label, w], i) => (
                  <div key={label} title={`${label}: ${w}`} style={{ width: `${w}%`, background: SLICE[i] }} />
                ))}
              </div>
              <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2">
                {criteria.map(([label, w], i) => (
                  <li key={label} className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-2 text-ink-2">
                      <span className="size-2 shrink-0 rounded-full" style={{ background: SLICE[i] }} />
                      {label}
                    </span>
                    <span className="font-medium tabular-nums">{w}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap gap-x-3 gap-y-2 border-t border-line pt-4">
                {rubric.tiers.map((t) => (
                  <span key={t.tier} className="flex items-center gap-1.5 text-[11px] text-ink-3">
                    <TierChip tier={t.tier} /> {t.min}+
                  </span>
                ))}
              </div>
            </div>

            <div className="grad-iris flex flex-col justify-between rounded-[28px] p-6 text-white">
              <div>
                <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] ring-1 ring-white/30">Salesforce Flow logic</span>
                <h3 className="mt-4 font-display text-2xl font-medium">Routing you can tune live</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/85">
                  Score decides the queue, region picks the AE team, and every Hot lead gets a call task inside the SLA.
                  Move the thresholds on the results page and watch leads re-route.
                </p>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  {["Lead created", "Decide", "Assign queue", "Create task"].map((s) => (
                    <span key={s} className="rounded-full bg-white/15 px-2.5 py-1 ring-1 ring-white/25">
                      {s}
                    </span>
                  ))}
                </div>
                <a
                  href={`${GITHUB_URL}/tree/main/salesforce`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-white px-4 py-2 text-xs font-medium text-ink"
                >
                  Flow metadata on GitHub
                </a>
              </div>
            </div>
          </div>
        </section>

        <HireMe variant="full" />

        <Footer />
      </main>
    </div>
  );
}
