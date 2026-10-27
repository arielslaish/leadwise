"use client";

// First screen: the pain, the fix, and who built it, on one frosted card.

import { LINKEDIN_URL, Logo } from "./ui";

export function Intro({ onStart, onHowItWorks }: { onStart: () => void; onHowItWorks: () => void }) {
  return (
    <div className="intro-bg relative flex min-h-dvh flex-col overflow-hidden text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="blob left-[-10%] top-[-10%] size-[60vmax] bg-[#1f6f4a]" />
        <div className="blob bottom-[-20%] right-[-15%] size-[50vmax] bg-[#c98328] opacity-60" style={{ animationDelay: "-6s" }} />
        <div className="blob left-[35%] top-[40%] size-[35vmax] bg-[#2e8b57] opacity-50" style={{ animationDelay: "-12s" }} />
      </div>

      <header className="relative z-10 px-5 py-5 sm:px-10">
        <Logo light />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
        <div className="glass rise w-full max-w-2xl rounded-[36px] p-7 transition duration-500 hover:-translate-y-1 hover:bg-white/[0.11] sm:p-12">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] text-white/80 ring-1 ring-white/20">
            <span className="size-1.5 rounded-full bg-gold" />
            Lead scoring demo · built by Ariel Laish
          </span>
          <h1 className="mt-6 font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-6xl">
            Tired of fighting <span className="font-serif font-normal italic text-[#f2c14e]">messy</span> lead data?
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-relaxed text-white/75 sm:text-base">
            Drop in a messy list. Leadwise cleans it, scores every lead with AI and tells your reps exactly who to call first.
          </p>

          <div className="mt-6 rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/15">
            <p className="text-sm leading-relaxed text-white/85">
              I&apos;m{" "}
              <a href={LINKEDIN_URL} target="_blank" rel="noreferrer" className="font-medium text-white underline-offset-4 hover:underline">
                Ariel Laish
              </a>
              , a GTM engineer. I built this to show what I can build for your team.{" "}
              <span className="text-white">If I can do this for free, imagine it running on your pipeline full-time.</span>
            </p>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button onClick={onStart} className="rounded-full bg-white px-6 py-3.5 text-sm font-medium text-ink transition hover:bg-white/90">
              Get started →
            </button>
            <button
              onClick={onHowItWorks}
              className="rounded-full px-6 py-3.5 text-sm font-medium text-white ring-1 ring-white/30 transition hover:bg-white/10"
            >
              See how it works
            </button>
          </div>
        </div>
      </main>

      <footer className="relative z-10 px-5 pb-6 text-center text-xs text-white/55">
        Made by{" "}
        <a href={LINKEDIN_URL} target="_blank" rel="noreferrer" className="font-medium text-white underline-offset-4 hover:underline">
          Ariel Laish
        </a>
      </footer>
    </div>
  );
}
