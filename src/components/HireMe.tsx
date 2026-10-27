// The pitch: Leadwise is the demo, Ariel is the product.
// "full" closes the home page; "banner" sits above the ranked leads on results.

import { LINKEDIN_URL } from "./ui";

const EMAIL = "mailto:arielslaish@gmail.com?subject=Saw%20Leadwise";

const PROOF = [
  ["1% → 3.2%", "reply rates after I built AI account scoring that fed only top-fit accounts into Salesloft"],
  ["6K+", "CRM records cleaned after tracing duplicates across 4 integrated tools to their source"],
  ["12%", "fewer lead handoff errors after I rebuilt routing and lifecycle stages in Salesforce Flows"],
];

function Actions() {
  return (
    <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
      <a href={LINKEDIN_URL} target="_blank" rel="noreferrer" className="whitespace-nowrap rounded-full bg-white px-5 py-3 text-center text-sm font-medium text-ink">
        Connect on LinkedIn
      </a>
      <a href={EMAIL} className="whitespace-nowrap rounded-full px-5 py-3 text-center text-sm font-medium text-white ring-1 ring-white/35 hover:bg-white/10">
        Email me
      </a>
    </div>
  );
}

export function HireMe({ variant }: { variant: "full" | "banner" }) {
  if (variant === "banner") {
    return (
      <section className="grad-dusk relative overflow-hidden rounded-[28px] p-6 text-white sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] ring-1 ring-white/25">Built by Ariel Laish</span>
            <p className="mt-3 font-display text-2xl font-medium leading-tight sm:text-3xl">
              This is a demo for any business. Imagine it built around your pipeline.
            </p>
            <p className="mt-2 text-sm text-white/70">
              I build revenue systems like this for a living: data hygiene, AI scoring, Salesforce routing. Let&apos;s talk.
            </p>
          </div>
          <Actions />
        </div>
      </section>
    );
  }

  return (
    <section id="about" className="grad-dusk scroll-mt-20 overflow-hidden rounded-[32px] p-7 text-white sm:p-10">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] ring-1 ring-white/25">The person behind Leadwise</span>
          <h2 className="mt-4 font-display text-3xl font-medium leading-tight tracking-tight sm:text-4xl">
            If I can build this for any business, imagine what I&apos;d build for yours.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/75">
            I&apos;m Ariel Laish, a GTM engineer and RevOps builder. I find the manual work slowing revenue teams down and
            replace it with automation that runs on its own: Salesforce Flows, integrations, and AI that scores, routes and
            summarizes. Leadwise is a small, working example.
          </p>
          <p className="mt-3 text-xs text-white/55">
            Open to GTM Engineer, RevOps, Marketing Ops and AI Solutions roles · Tel Aviv area
          </p>
          <div className="mt-6">
            <Actions />
          </div>
        </div>
        <ul className="space-y-2">
          {PROOF.map(([n, t]) => (
            <li key={n} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
              <span className="font-display text-2xl font-medium">{n}</span>
              <p className="mt-0.5 text-xs leading-relaxed text-white/70">{t}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
