"use client";

// The pitch: Leadwise is the demo, Ariel is the product.
// Contact is reused on the intro, home and results; HireMe is the results banner.

import { useState } from "react";
import { LINKEDIN_URL } from "./ui";

export const EMAIL = "arielslaish@gmail.com";

export const PROOF = [
  ["1% → 3.2%", "reply rates from AI account scoring I built"],
  ["6K+", "CRM records cleaned at the source"],
  ["12%", "fewer handoff errors with Salesforce Flows"],
];

// LinkedIn button plus the full email address, with one-click copy.
export function Contact({ dark }: { dark?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={LINKEDIN_URL}
        target="_blank"
        rel="noreferrer"
        className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium ${dark ? "bg-white text-ink" : "bg-ink text-white"}`}
      >
        LinkedIn ↗
      </a>
      <span
        className={`inline-flex items-center gap-1 rounded-full py-1 pl-3 pr-1 text-xs ${
          dark ? "bg-white/10 text-white ring-1 ring-white/25" : "bg-white text-ink ring-1 ring-line"
        }`}
      >
        <a href={`mailto:${EMAIL}?subject=Saw%20Leadwise`} className="underline-offset-4 hover:underline">
          {EMAIL}
        </a>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(EMAIL).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          className={`rounded-full px-2 py-1 text-[10px] font-medium ${dark ? "bg-white/15" : "bg-brand-soft text-brand"}`}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </span>
    </div>
  );
}

export function HireMe() {
  return (
    <section className="grad-deep rounded-[28px] p-6 text-white sm:p-7">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        <div className="max-w-2xl">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#8be3b0]">Built by Ariel Laish</p>
          <p className="mt-2 font-display text-2xl font-medium leading-tight sm:text-3xl">
            This demo works for any business. Imagine one built around yours.
          </p>
          <p className="mt-2 text-sm text-white/70">
            I clean data, build AI scoring and automate Salesforce routing for revenue teams. If I made this for free, think
            what I&apos;d do on your team full-time.
          </p>
        </div>
        <Contact dark />
      </div>
    </section>
  );
}
