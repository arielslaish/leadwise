"use client";

// Home page: explains the product and puts the two entry points front and center.

import { useRef, useState } from "react";
import { MAX_ROWS, rubric } from "@/config/rubric";
import { Footer, GITHUB_URL, LINKEDIN_URL, Logo, TierChip } from "./ui";

const STEPS = [
  { n: "01", title: "Parse", body: "Reads any CRM or spreadsheet export and maps its columns, whatever they're called.", example: "\"Work Email\" → email" },
  { n: "02", title: "Clean", body: "Fixes casing, normalizes cities and countries, merges duplicates, flags test junk.", example: "TLV → Tel Aviv · 4 duplicates merged" },
  { n: "03", title: "Score", body: "Claude scores every lead 0-100 against the rubric below and explains why in one line.", example: "92 · Hot · \"Demo request, VP Sales\"" },
  { n: "04", title: "Route", body: "A Salesforce-style Flow assigns each lead to a queue and creates the follow-up task.", example: "→ ISR AE Queue · call due tomorrow" },
];

export function Home({ onSample, onFile, error }: { onSample: () => void; onFile: (f: File) => void; error: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const criteria: [string, number, string[]][] = [
    [rubric.companySize.label, rubric.companySize.weight, rubric.companySize.bands.map((b) => `${b.band} employees · ${b.points}`)],
    [rubric.seniority.label, rubric.seniority.weight, rubric.seniority.levels.map((l) => `${l.level} · ${l.points}`)],
    [rubric.industry.label, rubric.industry.weight, rubric.industry.tiers.map((t) => `${t.match.join(", ")} · ${t.points}`)],
    [rubric.region.label, rubric.region.weight, rubric.region.tiers.map((t) => `${t.match.join(", ")} · ${t.points}`)],
    [rubric.intent.label, rubric.intent.weight, rubric.intent.signals.map((s) => `${s.signal} · ${s.points}`)],
    [rubric.completeness.label, rubric.completeness.weight, [rubric.completeness.rule]],
  ];

  return (
    <div className="min-h-dvh">
      <nav className="sticky top-0 z-30 border-b border-line bg-page/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-3 sm:px-8">
          <Logo />
          <div className="flex items-center gap-1 text-xs text-ink-2 sm:gap-2">
            <a href="#how" className="hidden rounded-full px-3 py-2 hover:bg-white sm:block">How it works</a>
            <a href="#rubric" className="hidden rounded-full px-3 py-2 hover:bg-white sm:block">Scoring</a>
            <a href="#routing" className="hidden rounded-full px-3 py-2 hover:bg-white sm:block">Routing</a>
            <a href={LINKEDIN_URL} target="_blank" rel="noreferrer" className="rounded-full bg-white px-3 py-2 ring-1 ring-line">
              LinkedIn
            </a>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-[1500px] px-4 sm:px-8">
        {/* Hero */}
        <section className="pb-10 pt-10 sm:pt-16">
          <div className="rise max-w-3xl">
            <span className="rounded-full bg-iris-soft px-3 py-1 text-[11px] font-medium text-iris">Lead scoring demo</span>
            <h1 className="mt-5 font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-6xl">
              Find out who your reps should call first.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-2 sm:text-base">
              Upload up to {MAX_ROWS} leads from any CRM, event or list export. In seconds you get a cleaned, ranked list
              with a score, a tier, a routing queue and the reason behind each one.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            <button
              onClick={onSample}
              className="grad-iris group relative flex min-h-64 flex-col justify-between overflow-hidden rounded-[32px] p-7 text-left text-white transition hover:-translate-y-0.5 hover:shadow-2xl sm:min-h-80 sm:p-9"
            >
              <span className="w-fit rounded-full bg-white/20 px-3 py-1 text-[11px] font-medium ring-1 ring-white/30 backdrop-blur">
                One click · no file needed
              </span>
              <div>
                <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">Run the sample list</h2>
                <p className="mt-2 max-w-sm text-sm text-white/85">
                  40 messy, fictional leads: duplicates, &quot;TLV&quot; vs &quot;Tel Aviv&quot;, test junk and all.
                </p>
                <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-ink transition group-hover:gap-3">
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
              className={`card flex min-h-64 cursor-pointer flex-col justify-between p-7 transition hover:-translate-y-0.5 sm:min-h-80 sm:p-9 ${
                dragging ? "ring-2 ring-iris" : ""
              }`}
            >
              <span className="w-fit rounded-full bg-iris-soft px-3 py-1 text-[11px] font-medium text-iris">Your own data</span>
              <div className="rounded-3xl border-2 border-dashed border-ink/10 p-6 text-center">
                <span aria-hidden className="mx-auto grid size-12 place-items-center rounded-2xl bg-ink text-xl text-white">↑</span>
                <h2 className="mt-4 font-display text-2xl font-medium tracking-tight sm:text-3xl">Upload your lead list</h2>
                <p className="mt-1 text-sm text-ink-2">
                  Drop a CSV here or <span className="font-medium text-iris underline underline-offset-4">browse</span>
                </p>
                <p className="mt-3 text-[11px] text-ink-3">Any export · first {MAX_ROWS} rows are scored · never stored</p>
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

          <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ["~6 sec", "to score a full list"],
              ["6", "transparent scoring criteria"],
              ["4", "tiers, from Hot to Disqualify"],
              ["0", "uploaded rows stored"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-2xl bg-white/60 px-4 py-3 ring-1 ring-line">
                <dt className="font-display text-2xl font-medium">{v}</dt>
                <dd className="text-[11px] text-ink-3">{l}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 py-12">
          <h2 className="font-display text-3xl font-medium tracking-tight">How it works</h2>
          <p className="mt-1 text-sm text-ink-2">Four steps, one upload. The AI does the judgment; the rules stay visible.</p>
          <ol className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="card flex flex-col p-6">
                <span className="font-display text-sm font-semibold text-iris">{s.n}</span>
                <p className="mt-3 font-display text-xl font-medium">{s.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{s.body}</p>
                <p className="mt-auto pt-5 font-mono text-[11px] text-ink-3">{s.example}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Rubric */}
        <section id="rubric" className="scroll-mt-20 py-12">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-display text-3xl font-medium tracking-tight">The scoring rubric</h2>
              <p className="mt-1 max-w-xl text-sm text-ink-2">
                Every lead earns points across six criteria, 100 in total. Claude applies them; the tier comes from the total.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {rubric.tiers.map((t) => (
                <span key={t.tier} className="flex items-center gap-1.5 text-xs text-ink-3">
                  <TierChip tier={t.tier} /> {t.min}+
                </span>
              ))}
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {criteria.map(([label, weight, items]) => (
              <div key={label} className="card p-6">
                <div className="flex items-baseline justify-between">
                  <p className="font-display text-lg font-medium">{label}</p>
                  <span className="font-display text-3xl font-medium text-iris">{weight}</span>
                </div>
                <ul className="mt-3 space-y-1.5 text-xs text-ink-2">
                  {items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Routing */}
        <section id="routing" className="scroll-mt-20 py-12">
          <div className="grad-dusk overflow-hidden rounded-[32px] p-7 text-white sm:p-10">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] ring-1 ring-white/25">Salesforce Flow logic</span>
                <h2 className="mt-4 font-display text-3xl font-medium tracking-tight sm:text-4xl">Routing you can tune live</h2>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75">
                  Results run through a record-triggered Flow: tier decides the queue, region picks the AE team, and every
                  Hot lead gets a call task inside the SLA. Move the Hot threshold or the SLA and watch leads re-route.
                </p>
                <a
                  href={`${GITHUB_URL}/tree/main/salesforce`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 inline-block rounded-full bg-white px-5 py-2.5 text-xs font-medium text-ink"
                >
                  See the Flow metadata on GitHub
                </a>
              </div>
              <ol className="space-y-2 text-sm">
                {[
                  ["Lead created", "Record-triggered, after save"],
                  ["Decide route", "Disqualify · Hot (score ≥ threshold) · Warm · Nurture"],
                  ["Assign queue", "AMER, ISR, EMEA or APAC AE · SDR · Nurture · Hygiene"],
                  ["Create task", "Hot: call within SLA · Warm: outreach in 3 days"],
                ].map(([t, d], i) => (
                  <li key={t} className="flex gap-4 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
                    <span className="font-display text-white/50">{i + 1}</span>
                    <span>
                      <span className="block font-medium">{t}</span>
                      <span className="text-xs text-white/65">{d}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="py-12 text-center">
          <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">Ready to see your list ranked?</h2>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button onClick={onSample} className="rounded-full bg-ink px-6 py-3.5 text-sm font-medium text-white">
              Run the sample list
            </button>
            <button onClick={() => input.current?.click()} className="rounded-full bg-white px-6 py-3.5 text-sm font-medium ring-1 ring-line">
              Upload your CSV
            </button>
          </div>
        </section>

        <Footer />
      </main>
    </div>
  );
}
