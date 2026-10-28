"use client";

// Results dashboard: full-width, scrollable, stacked on mobile.

import Papa from "papaparse";
import { useMemo, useState } from "react";
import type { Tier } from "@/config/rubric";
import { defaultFlowVariables, type FlowVariables } from "@/lib/flow";
import { buildRows, csvRecords, summarize, type Corrections } from "@/lib/summary";
import { AuditPanel, ImportPanel } from "./Audit";
import { Breakdown } from "./Breakdown";
import { FlowCard } from "./FlowCard";
import { downloadPdf } from "@/lib/report";
import { GateModal } from "./GateModal";
import { HireMe } from "./HireMe";
import { LeadTable } from "./LeadTable";
import { ScoreStrip } from "./ScoreStrip";
import { Footer, Logo, PillButton, SectionTitle, Tag, TIERS, TierChip, tierColor } from "./ui";
import type { ScoreResponse } from "./types";

export function Results({ result, fileName, onReset }: { result: ScoreResponse; fileName: string; onReset: () => void }) {
  const [filter, setFilter] = useState<Tier | "All">("All");
  const [flowVars, setFlowVars] = useState<FlowVariables>(defaultFlowVariables);
  const [gateOpen, setGateOpen] = useState(false);

  const [corrections, setCorrections] = useState<Corrections>({});
  // One classification feeds every number on the page, the CSV and the PDF.
  const rows = useMemo(() => buildRows(result.leads, flowVars, corrections), [result, flowVars, corrections]);
  const summary = useMemo(() => summarize(rows, result.import), [rows, result.import]);
  const hotCount = summary.hot;
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = rows.filter(
    (r) =>
      (filter === "All" || r.flow.tier === filter) &&
      (!q ||
        [r.lead.firstName, r.lead.lastName, r.lead.company, r.lead.title, r.lead.region, r.flow.owner]
          .join(" ")
          .toLowerCase()
          .includes(q)),
  );
  const correct = (id: number, t: Tier | null) =>
    setCorrections((c) => {
      const next = { ...c };
      if (t) next[id] = t;
      else delete next[id];
      return next;
    });

  function showTier(t: Tier | "All") {
    setFilter(t);
    document.getElementById("ranked")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function downloadReport() {
    downloadPdf({ fileName, rows, summary });
  }

  function downloadCsv() {
    const csv = Papa.unparse(csvRecords(rows));
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "leadwise-scored.csv" });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-dvh">
      <nav className="sticky top-0 z-30 border-b border-line bg-page/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <button onClick={onReset} aria-label="Back to home">
            <Logo />
          </button>
          <div className="flex items-center gap-2">
            {result.owner && <Tag>Owner mode · no limits</Tag>}
            <PillButton onClick={onReset}>New list</PillButton>
            <PillButton dark onClick={() => setGateOpen(true)}>
              Download
            </PillButton>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-[1600px] space-y-6 px-4 pb-4 pt-6 sm:px-8 sm:pt-10">
        <header className="rise flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs text-ink-3">{fileName}</p>
            <h1 className="mt-1 font-display text-4xl font-medium tracking-tight sm:text-5xl">Who to call first</h1>
            {result.import.overLimit.count > 0 && (
              <p className="mt-2 text-xs text-[#8a5d00]">
                {result.import.overLimit.count} rows over the {result.import.processed}-row limit were not processed. See the import summary below.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
            <Kpi value={result.import.processed} label="Rows processed" tag="Raw" />
            <Kpi value={summary.duplicates.merged} label="Duplicates merged" tag="Cleaned" tone="gray" />
            <Kpi value={hotCount} label="Hot accounts" tag="Call now" />
            <Kpi value={summary.quality.Invalid} label="Invalid records" tag="To hygiene" tone="gray" />
          </div>
        </header>

        {/* Tier filter pills, horizontally scrollable on phones */}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {(["All", ...TIERS] as const).map((t) => (
            <button
              key={t}
              onClick={() => showTier(t)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-xs transition ${
                filter === t ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-line hover:bg-white/70"
              }`}
            >
              <span className="size-2 rounded-full" style={{ background: t === "All" ? "var(--brand)" : tierColor[t] }} />
              {t === "All" ? "All leads" : t}
              <span className={`tabular-nums ${filter === t ? "text-white/60" : "text-ink-3"}`}>
                {t === "All" ? rows.length : summary.tiers[t]}
              </span>
            </button>
          ))}
        </div>

        <ScoreStrip rows={rows} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <HeroCard className="grad-forest" label="Average lead score" value={summary.avgScore} caption="of 100, valid records only" />
          <HeroCard
            className="grad-bright"
            label="Hot accounts"
            value={hotCount}
            caption={`${summary.hotShareOfValid}% of valid leads`}
          />
          <div className="md:col-span-2 xl:col-span-1">
            <FlowCard vars={flowVars} onChange={setFlowVars} outcomes={rows.map((r) => r.flow)} />
          </div>
        </div>

        <HireMe />

        <div className="grid gap-6 xl:grid-cols-[1fr_1.3fr]">
          <div>
            <SectionTitle title="Breakdown" sub="Where the list stands after cleaning" />
            <Breakdown rows={rows} />
          </div>
          <div>
            <SectionTitle
              title="Call first"
              sub="Highest-scoring leads and why"
              action={<PillButton onClick={() => showTier("Hot")}>See all Hot</PillButton>}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              {rows.filter((r) => r.flow.tier === "Hot" || r.flow.tier === "Warm").slice(0, 3).map(({ lead, flow }) => (
                <div key={lead.id} className="card flex flex-col p-5">
                  <div className="flex items-start justify-between">
                    <TierChip tier={flow.tier} />
                    <span className="font-display text-4xl font-medium leading-none">{lead.score}</span>
                  </div>
                  <p className="mt-4 text-sm font-medium">
                    {lead.firstName} {lead.lastName}
                  </p>
                  <p className="text-[11px] text-ink-3">
                    {lead.title} · {lead.company}
                  </p>
                  <p className="mt-2 text-xs leading-snug text-ink-2">{lead.reason}</p>
                  <p className="mt-auto pt-3 text-[11px] text-ink-3">→ {flow.owner}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ImportPanel summary={summary} rows={rows} />
          <AuditPanel summary={summary} />
        </div>

        <section id="ranked" className="card scroll-mt-20 p-4 sm:p-6">
          <SectionTitle
            title={filter === "All" ? "Ranked leads" : `${filter} leads`}
            sub={`${visible.length} of ${rows.length} leads · click a lead for its score breakdown, data issues and routing`}
            action={
              <PillButton dark onClick={() => setGateOpen(true)}>
                Download
              </PillButton>
            }
          />
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {filter !== "All" && (
                <button
                  onClick={() => setFilter("All")}
                  className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-[11px] font-medium text-white"
                >
                  ← All leads
                </button>
              )}
              {TIERS.map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(filter === t ? "All" : t)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] ring-1 transition ${
                    filter === t ? "bg-brand-soft ring-brand/40" : "bg-white ring-line hover:bg-white/70"
                  }`}
                >
                  <span className="size-1.5 rounded-full" style={{ background: tierColor[t] }} />
                  {t}
                </button>
              ))}
            </div>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, company, queue…"
              className="w-full rounded-full bg-white px-4 py-2 text-xs ring-1 ring-line outline-none focus:ring-brand/50 sm:w-64"
            />
          </div>
          <LeadTable rows={visible} onCorrect={correct} />
        </section>

        <Footer />
      </main>

      {gateOpen && (
        <GateModal stats={{ rowsIn: result.import.processed, hot: hotCount }} onDownload={(f) => (f === "pdf" ? downloadReport() : downloadCsv())} onClose={() => setGateOpen(false)} />
      )}
    </div>
  );
}

function Kpi({
  value,
  label,
  tag,
  tone = "brand",
  suffix = "",
}: {
  value: number;
  label: string;
  tag: string;
  tone?: "brand" | "gray";
  suffix?: string;
}) {
  return (
    <div>
      <div className="flex items-start gap-1.5">
        <span className="font-display text-4xl font-medium leading-none">{`${value}${suffix}`}</span>
        <Tag tone={tone}>{tag}</Tag>
      </div>
      <p className="mt-1.5 text-[11px] text-ink-3">{label}</p>
    </div>
  );
}

function HeroCard({ className, label, value, caption }: { className: string; label: string; value: number; caption: string }) {
  return (
    <div className={`${className} relative flex min-h-60 flex-col items-center justify-center overflow-hidden rounded-[28px] p-5 text-white`}>
      <p className="absolute top-5 text-xs text-white/90">{label}</p>
      <p className="font-display text-8xl font-medium leading-none tracking-tight drop-shadow-sm">{value}</p>
      <p className="mt-2 text-xs text-white/90">{caption}</p>
      <div className="ticks absolute inset-x-6 bottom-5 h-4 opacity-70" aria-hidden />
    </div>
  );
}
