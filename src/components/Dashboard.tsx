"use client";

// App shell: intro → home → thinking → results. One page, no routing.

import Papa from "papaparse";
import { MAX_ROWS } from "@/config/rubric";
import { PillButton } from "./ui";
import { useCallback, useEffect, useState } from "react";
import { Home } from "./Home";
import { Intro } from "./Intro";
import { Results } from "./Results";
import { Thinking } from "./Thinking";
import type { ScoreResponse } from "./types";

type Screen = "intro" | "home" | "thinking" | "results";

const OWNER_STORAGE = "leadwise-owner-key";

function ownerKey(): string | null {
  try {
    return localStorage.getItem(OWNER_STORAGE);
  } catch {
    return null;
  }
}

export function Dashboard() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [fileName, setFileName] = useState("");
  const [rowCount, setRowCount] = useState(0);
  const [pending, setPending] = useState<{ csv: string; name: string; count: number } | null>(null);
  const [result, setResult] = useState<ScoreResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Owner mode: opening the site once with ?owner=<key> stores the key on this device.
  useEffect(() => {
    const url = new URL(window.location.href);
    const key = url.searchParams.get("owner");
    if (!key) return;
    try {
      localStorage.setItem(OWNER_STORAGE, key);
    } catch {}
    url.searchParams.delete("owner");
    window.history.replaceState(null, "", url.toString());
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  // Files over the limit get an explanation first, before anything is processed.
  function score(csv: string, name: string) {
    const count = Papa.parse(csv.trim(), { header: true, skipEmptyLines: "greedy" }).data.length;
    if (count > MAX_ROWS) return setPending({ csv, name, count });
    run(csv, name, count);
  }

  async function run(csv: string, name: string, count: number) {
    setPending(null);
    setError(null);
    setResult(null);
    setFileName(name);
    setRowCount(count);
    setScreen("thinking");

    const key = ownerKey();
    const res = await fetch("/api/score", {
      method: "POST",
      headers: { "content-type": "application/json", ...(key ? { "x-owner-key": key } : {}) },
      body: JSON.stringify({ csv }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) {
      setError(data?.error ?? "Couldn't reach the server. Try again.");
      setScreen("home");
      return;
    }
    setResult(data);
  }

  async function onFile(file: File) {
    if (file.size > 200_000) return setError("That file is over 200KB. Trim it to around 100 rows and try again.");
    score(await file.text(), file.name);
  }

  async function onSample() {
    const csv = await fetch("/sample-leads.csv").then((r) => r.text());
    score(csv, "sample-leads.csv");
  }

  const onThinkingDone = useCallback(() => setScreen("results"), []);

  if (screen === "intro") {
    return (
      <Intro
        onStart={() => setScreen("home")}
        onHowItWorks={() => {
          setScreen("home");
          setTimeout(() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" }), 50);
        }}
      />
    );
  }

  if (screen === "results" && result) {
    return <Results result={result} fileName={fileName} onReset={() => setScreen("home")} />;
  }

  return (
    <>
      <Home onSample={onSample} onFile={onFile} error={error} />
      {pending && (
        <div role="dialog" aria-modal="true" aria-labelledby="limit-title" className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-4 backdrop-blur-sm sm:items-center">
          <div className="card w-full max-w-md bg-white/95 p-6">
            <h2 id="limit-title" className="font-display text-xl tracking-tight">
              {pending.count} rows found
            </h2>
            <p className="mt-2 text-sm text-ink-2">
              The demo processes the first {MAX_ROWS} rows of a file. The other {pending.count - MAX_ROWS} will be skipped, and the import
              summary lists exactly which rows. To score everything, split the file into parts of {MAX_ROWS}.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <PillButton onClick={() => setPending(null)}>Cancel</PillButton>
              <PillButton dark onClick={() => run(pending.csv, pending.name, pending.count)}>
                Process first {MAX_ROWS}
              </PillButton>
            </div>
          </div>
        </div>
      )}
      {screen === "thinking" && <Thinking fileName={fileName} rowCount={rowCount} result={result} onDone={onThinkingDone} />}
    </>
  );
}
