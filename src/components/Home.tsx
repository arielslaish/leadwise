"use client";

// Home page, kept deliberately sparse: the problem, who built this, then the
// two ways to try it. How it works is plain text underneath.

import Image from "next/image";
import { useRef, useState } from "react";
import { MAX_ROWS, rubric } from "@/config/rubric";
import { Contact, PROOF } from "./HireMe";
import { Footer, GITHUB_URL, Logo } from "./ui";

const STEPS = ["Parse any export", "Clean and dedupe", "Score with Claude", "Route like Salesforce"];

export function Home({ onSample, onFile, error }: { onSample: () => void; onFile: (f: File) => void; error: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div className="min-h-dvh">
      <nav className="sticky top-0 z-30 border-b border-line bg-page/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-3 sm:px-8">
          <Logo />
          <a href="#me" className="rounded-full bg-ink px-4 py-2 text-xs text-white">
            Built by Ariel
          </a>
        </div>
      </nav>

      <main className="mx-auto max-w-[1200px] px-4 pb-4 pt-10 sm:px-8 sm:pt-16">
        {/* The problem, and who's solving it */}
        <section className="rise grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-brand">The problem</p>
            <h1 className="mt-3 font-display text-4xl font-medium leading-[1.04] tracking-tight sm:text-6xl">
              Your reps are calling the <span className="font-serif font-normal italic text-brand">wrong</span> leads.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-2 sm:text-base">
              Duplicates, stale records and no clear owner quietly cost pipeline every week. Drop in a list and watch it get
              cleaned, scored by AI and routed, in seconds.
            </p>
          </div>

          <div id="me" className="scroll-mt-24 border-l-2 border-brand/30 pl-6 lg:self-end">
            <div className="flex items-center gap-4">
              <Image
                src="/ariel-laish.webp"
                alt="Ariel Laish"
                width={64}
                height={64}
                priority
                className="size-16 rounded-full object-cover ring-2 ring-brand/30 ring-offset-2 ring-offset-page"
              />
              <div>
                <p className="font-display text-lg font-medium leading-tight">Ariel Laish</p>
                <p className="text-xs text-ink-3">GTM engineer · RevOps · AI automation</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink">
              I built Leadwise for free to show what I can do. Imagine what I&apos;d build for your team full-time.
            </p>
            <ul className="mt-3 space-y-1 text-xs text-ink-2">
              {PROOF.map(([n, t]) => (
                <li key={n}>
                  <span className="font-semibold text-ink">{n}</span> {t}
                </li>
              ))}
            </ul>
            <div className="mt-5">
              <Contact />
            </div>
          </div>
        </section>

        {/* The two main actions */}
        <section className="mt-12 grid gap-4 md:grid-cols-2 sm:mt-16">
          <button
            onClick={onSample}
            className="grad-forest group flex min-h-64 flex-col justify-between rounded-[28px] p-7 text-left text-white transition hover:-translate-y-0.5 hover:shadow-2xl sm:p-9"
          >
            <span className="text-xs text-white/75">One click · no file needed</span>
            <div>
              <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">Run the sample list</h2>
              <p className="mt-1.5 text-sm text-white/85">40 messy, fictional leads: duplicates, junk and all.</p>
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
            className={`flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-[28px] border-2 border-dashed bg-white/60 p-7 text-center transition hover:-translate-y-0.5 hover:bg-white ${
              dragging ? "border-brand bg-white" : "border-ink/15"
            }`}
          >
            <span aria-hidden className="grid size-11 place-items-center rounded-2xl bg-ink text-lg text-white">↑</span>
            <h2 className="mt-4 font-display text-3xl font-medium tracking-tight">Upload your own list</h2>
            <p className="mt-1.5 text-sm text-ink-2">
              Drop a CSV or <span className="font-medium text-brand underline underline-offset-4">browse</span>
            </p>
            <p className="mt-2 text-[11px] text-ink-3">Any CRM export · up to {MAX_ROWS} rows per upload · never stored</p>
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
        </section>

        {error && (
          <div role="alert" className="mt-4 rounded-2xl bg-hot/10 px-4 py-3 text-sm text-hot">
            {error}
          </div>
        )}

        {/* How it works, as plain text */}
        <section className="mt-16 border-t border-line pt-8">
          <h2 className="font-display text-xl font-medium">How it works</h2>
          <ol className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-2">
            {STEPS.map((s, i) => (
              <li key={s}>
                <span className="mr-1.5 font-semibold text-brand">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
          <p className="mt-4 max-w-3xl text-xs leading-relaxed text-ink-3">
            Data quality and lead quality are judged separately. Every record is first checked (email, name, phone, company,
            location, duplicates); invalid ones go to Data Hygiene. Valid leads are scored out of 100: company size{" "}
            {rubric.companySize.weight}, title seniority {rubric.seniority.weight}, industry fit {rubric.industry.weight}, buying
            intent {rubric.intent.weight}, region {rubric.region.weight}, data completeness {rubric.completeness.weight}. Hot is 75+,
            Warm 55+, and strong buying signals are at least Warm. A low score never disqualifies a lead; only invalid data or an
            explicit &ldquo;not interested&rdquo; does. Routing mirrors a Salesforce record-triggered Flow, and you can tune it on the
            results page.{" "}
            <a href={`${GITHUB_URL}/tree/main/salesforce`} target="_blank" rel="noreferrer" className="text-brand underline underline-offset-4">
              See the Flow on GitHub
            </a>
            .
          </p>
        </section>

        <Footer />
      </main>
    </div>
  );
}
