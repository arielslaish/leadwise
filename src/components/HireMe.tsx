// The pitch: Leadwise is the demo, Ariel is the product.
// "hero" sits beside the home headline, "banner" sits on the results page,
// "closing" ends the home page.

import { LINKEDIN_URL } from "./ui";

const EMAIL = "mailto:arielslaish@gmail.com?subject=Saw%20Leadwise";

const PROOF = [
  ["1% → 3.2%", "reply rates from AI account scoring I built"],
  ["6K+", "CRM records cleaned at the source"],
  ["12%", "fewer handoff errors via Salesforce Flows"],
];

function Actions({ compact }: { compact?: boolean }) {
  const size = compact ? "px-4 py-2 text-xs" : "px-5 py-3 text-sm";
  return (
    <div className="flex shrink-0 flex-wrap gap-2">
      <a href={LINKEDIN_URL} target="_blank" rel="noreferrer" className={`whitespace-nowrap rounded-full bg-white font-medium text-ink ${size}`}>
        Connect on LinkedIn
      </a>
      <a href={EMAIL} className={`whitespace-nowrap rounded-full font-medium text-white ring-1 ring-white/35 hover:bg-white/10 ${size}`}>
        Email me
      </a>
    </div>
  );
}

function Proof({ compact }: { compact?: boolean }) {
  return (
    <ul className="grid grid-cols-3 gap-2">
      {PROOF.map(([n, t]) => (
        <li key={n} className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15">
          <span className={`block whitespace-nowrap font-display font-medium ${compact ? "text-base sm:text-lg" : "text-xl sm:text-2xl"}`}>{n}</span>
          <span className="mt-0.5 block text-[10px] leading-snug text-white/70">{t}</span>
        </li>
      ))}
    </ul>
  );
}

export function HireMe({ variant }: { variant: "hero" | "banner" | "closing" }) {
  if (variant === "hero") {
    return (
      <aside id="about" className="grad-deep scroll-mt-20 rounded-[28px] p-5 text-white sm:p-6">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[#f2c14e]">Built by Ariel Laish</p>
        <p className="mt-2 font-display text-xl font-medium leading-snug sm:text-2xl">
          I built this for free. Imagine what I&apos;d build for your team full-time.
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-white/70">
          GTM engineer and RevOps builder: data hygiene, AI scoring and Salesforce automation for revenue teams.
        </p>
        <div className="mt-4">
          <Proof compact />
        </div>
        <div className="mt-4">
          <Actions compact />
        </div>
      </aside>
    );
  }

  if (variant === "banner") {
    return (
      <section className="grad-deep rounded-[28px] p-6 text-white sm:p-7">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[#f2c14e]">Built by Ariel Laish</p>
            <p className="mt-2 font-display text-2xl font-medium leading-tight sm:text-3xl">
              This demo works for any business. Imagine one built around yours.
            </p>
            <p className="mt-2 text-sm text-white/70">
              I clean data, build AI scoring and automate Salesforce routing for revenue teams. If I made this for free, think
              what I&apos;d do on your team full-time.
            </p>
          </div>
          <Actions />
        </div>
      </section>
    );
  }

  return (
    <section className="grad-deep rounded-[28px] p-6 text-white sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#f2c14e]">Hiring for GTM, RevOps or AI automation?</p>
          <h2 className="mt-2 font-display text-2xl font-medium leading-tight tracking-tight sm:text-3xl">
            Leadwise is my portfolio piece. The real product is what I&apos;d build for you.
          </h2>
          <p className="mt-2 text-sm text-white/70">Open to GTM Engineer, RevOps, Marketing Ops and AI Solutions roles · Tel Aviv area</p>
          <div className="mt-5">
            <Actions />
          </div>
        </div>
        <Proof />
      </div>
    </section>
  );
}
