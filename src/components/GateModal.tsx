"use client";

// Email gate in front of the CSV download. On success: the CSV downloads
// (built in the browser) and the visitor gets an optional CV link.

import { useState } from "react";
import { CONSENT_TEXT } from "@/config/rubric";
import { PillButton } from "./ui";

export function GateModal({
  stats,
  onDownload,
  onClose,
}: {
  stats: { rowsIn: number; hot: number };
  onDownload: () => void;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [cvUrl, setCvUrl] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError(null);
    const res = await fetch("/api/capture", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, consent, stats }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) {
      setState("idle");
      setError(data?.error ?? "Something went wrong. Try again.");
      return;
    }
    setCvUrl(data.cvUrl);
    setState("done");
    onDownload();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gate-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div className="card w-full max-w-md bg-white/95 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h2 id="gate-title" className="text-xl tracking-tight">
            {state === "done" ? "Your file is downloading" : "Get your scored list"}
          </h2>
          <button onClick={onClose} aria-label="Close" className="grid size-7 place-items-center rounded-full bg-ink/5 text-ink-2 hover:bg-ink/10">
            ✕
          </button>
        </div>

        {state === "done" ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-ink-2">
              Every row is ranked with its score, tier, routing queue and the reason behind it. Not downloading?{" "}
              <button onClick={onDownload} className="underline">
                Try again
              </button>
              .
            </p>
            <div className="grad-iris relative overflow-hidden rounded-3xl p-5 text-white">
              <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-medium text-white ring-1 ring-white/40">Hiring?</span>
              <p className="mt-3 font-display text-lg leading-snug">Leadwise was built by Ariel Laish, GTM &amp; AI automation.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {cvUrl && (
                  <a href={cvUrl} download className="rounded-full bg-white px-4 py-2 text-xs font-medium text-ink">
                    Download my CV
                  </a>
                )}
                <a
                  href="https://www.linkedin.com/in/ariellaish"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-white/25 px-4 py-2 text-xs font-medium text-white ring-1 ring-white/50"
                >
                  LinkedIn
                </a>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-4">
            <p className="text-sm text-ink-2">Enter your work email and the CSV downloads right away.</p>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-line outline-none focus:ring-ink/40"
            />
            <label className="flex gap-3 text-xs text-ink-2">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-ink"
              />
              {CONSENT_TEXT}
            </label>
            {error && <p className="text-xs text-hot">{error}</p>}
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] text-ink-3">Your uploaded data is never stored.</p>
              <PillButton type="submit" dark disabled={state === "sending" || !consent}>
                {state === "sending" ? "Sending…" : "Download CSV"}
              </PillButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
