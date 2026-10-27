"use client";

// App shell: intro → home → thinking → results. One page, no routing.

import Papa from "papaparse";
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

  async function score(csv: string, name: string) {
    setError(null);
    setResult(null);
    setFileName(name);
    setRowCount(Papa.parse(csv.trim(), { header: true, skipEmptyLines: "greedy" }).data.length);
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
      {screen === "thinking" && <Thinking fileName={fileName} rowCount={rowCount} result={result} onDone={onThinkingDone} />}
    </>
  );
}
