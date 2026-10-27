"use client";

import Papa from "papaparse";
import { useMemo, useRef, useState } from "react";
import { MAX_ROWS, rubric, type Tier } from "@/config/rubric";
import { defaultFlowVariables, runLeadFlow, type FlowVariables } from "@/lib/flow";
import { Breakdown } from "./Breakdown";
import { FlowCard } from "./FlowCard";
import { GateModal } from "./GateModal";
import { LeadTable } from "./LeadTable";
import { ScoreStrip } from "./ScoreStrip";
import { PillButton, SectionTitle, Tag, TIERS, TierChip, tierColor } from "./ui";
import type { ScoreResponse } from "./types";

type View = "leads" | "rubric";

export function Dashboard() {
  const [result, setResult] = useState<ScoreResponse | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("leads");
  const [filter, setFilter] = useState<Tier | "All">("All");
  const [flowVars, setFlowVars] = useState<FlowVariables>(defaultFlowVariables);
  const [gateOpen, setGateOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const rows = useMemo(
    () => (result?.leads ?? []).map((lead) => ({ lead, flow: runLeadFlow(lead, flowVars) })),
    [result, flowVars],
  );
  const hotCount = rows.filter((r) => r.flow.route === "Hot").length;
  const scored = rows.filter((r) => r.lead.tier !== "Disqualify");
  const avgScore = scored.length ? Math.round(scored.reduce((s, r) => s + r.lead.score, 0) / scored.length) : 0;
  const visible = filter === "All" ? rows : rows.filter((r) => r.lead.tier === filter);

  async function score(csv: string, name: string) {
    setLoading(true);
    setError(null);
    setFileName(name);
    const res = await fetch("/api/score", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ csv }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setLoading(false);
    if (!res?.ok) {
      setError(data?.error ?? "Couldn't reach the server. Try again.");
      return;
    }
    setResult(data);
    setFilter("All");
    setView("leads");
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 200_000) return setError("File is too large. Keep it under 200KB and 100 rows.");
    score(await file.text(), file.name);
  }

  async function trySample() {
    const csv = await fetch("/sample-leads.csv").then((r) => r.text());
    score(csv, "sample-leads.csv");
  }

  function downloadCsv() {
    const csv = Papa.unparse(
      rows.map(({ lead, flow }, i) => ({
        rank: i + 1,
        first_name: lead.firstName,
        last_name: lead.lastName,
        email: lead.email,
        title: lead.title,
        company: lead.company,
        segment: lead.segment,
        region: lead.region,
        score: lead.score,
        tier: lead.tier,
        seniority: lead.seniority,
        intent: lead.intent,
        reason: lead.reason,
        routed_to: flow.owner,
        task: flow.task ? `${flow.task.subject} (${flow.task.priority}, due in ${flow.task.dueInDays}d)` : "",
        sources: lead.sources.join("; "),
      })),
    );
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "leadwise-scored.csv" });
    a.click();
    URL.revokeObjectURL(url);
  }

  const tierCounts = new Map<Tier, number>();
  for (const r of rows) tierCounts.set(r.lead.tier, (tierCounts.get(r.lead.tier) ?? 0) + 1);

  return (
    <div className="mx-auto max-w-[1400px] p-3 sm:p-6">
      <div className="rounded-[36px] bg-panel p-4 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.35)] sm:p-6 lg:grid lg:grid-cols-[230px_1fr] lg:gap-8 lg:p-8">
        {/* Sidebar */}
        <aside className="mb-6 flex flex-col gap-6 lg:mb-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold tracking-tight">leadwise</span>
            <a
              href="/sample-leads.csv"
              download
              className="rounded-full bg-white px-3 py-1.5 text-[11px] text-ink-2 ring-1 ring-line lg:hidden"
            >
              Sample CSV
            </a>
          </div>
          <div className="flex gap-4 text-2xl tracking-tight">
            {(["leads", "rubric"] as View[]).map((v) => (
              <button key={v} onClick={() => setView(v)} className={view === v ? "text-ink" : "text-ink-3 hover:text-ink-2"}>
                {v === "leads" ? "Leads" : "Rubric"}
              </button>
            ))}
          </div>
          <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:flex-col lg:overflow-visible">
            {(["All", ...TIERS] as const).map((t) => {
              const n = t === "All" ? rows.length : (tierCounts.get(t) ?? 0);
              const active = filter === t && view === "leads";
              return (
                <button
                  key={t}
                  onClick={() => {
                    setFilter(t);
                    setView("leads");
                  }}
                  className={`flex shrink-0 items-center justify-between gap-3 rounded-2xl px-4 py-3 text-xs transition ${
                    active ? "bg-white shadow-sm ring-1 ring-line" : "bg-white/50 hover:bg-white/80"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: t === "All" ? "var(--ink)" : tierColor[t] }}
                    />
                    {t === "All" ? "All leads" : t}
                  </span>
                  {result && <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] tabular-nums text-ink-2">{n}</span>}
                </button>
              );
            })}
          </nav>
          <div className="card mt-auto hidden p-4 lg:block">
            <Tag>Built by</Tag>
            <p className="mt-2 text-sm font-medium">Ariel Laish</p>
            <p className="text-[11px] leading-snug text-ink-3">GTM engineering, RevOps and AI automation.</p>
            <div className="mt-3 flex justify-end">
              <a
                href="https://www.linkedin.com/in/ariellaish"
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-white px-3 py-1.5 text-[11px] font-medium ring-1 ring-line"
              >
                LinkedIn
              </a>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 space-y-6">
          <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
            <div className="space-y-5">
              <div>
                <p className="text-xs text-ink-3">{fileName ?? "Lead scoring demo"}</p>
                <h1 className="mt-1 text-3xl tracking-tight sm:text-4xl">
                  {result ? "Who to call first" : "Upload a lead list. See who to call first."}
                </h1>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                <Kpi value={result?.kpis.rowsIn} label="Rows in" tag="Raw" />
                <Kpi value={result?.kpis.duplicatesRemoved} label="Duplicates merged" tag="Cleaned" tone="gray" />
                <Kpi value={result ? hotCount : undefined} label="Hot accounts" tag="Call now" />
                <Kpi value={result?.kpis.repHoursSaved} label="Rep hours saved" tag="Est." tone="gray" suffix="h" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => fileInput.current?.click()}
                disabled={loading}
                className="card flex flex-col items-start justify-between p-4 text-left transition hover:bg-white disabled:opacity-60"
              >
                <div className="flex w-full items-start justify-between">
                  <span className="text-xs leading-snug">
                    Upload
                    <br />
                    lead list
                  </span>
                  <span className="grid size-7 place-items-center rounded-full bg-white text-sm ring-1 ring-line">+</span>
                </div>
                <span className="mt-8 text-[10px] text-ink-3">CSV · max {MAX_ROWS} rows</span>
              </button>
              <input
                ref={fileInput}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  onFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <button
                onClick={trySample}
                disabled={loading}
                className="mesh-pink relative flex flex-col items-start justify-between overflow-hidden rounded-[28px] p-4 text-left text-white transition hover:brightness-105 disabled:opacity-60"
              >
                <span className="relative z-10 text-xs leading-snug">
                  Try sample
                  <br />
                  data
                </span>
                <span aria-hidden className="absolute right-3 top-1/2 -translate-y-1/2">
                  {[56, 40, 24].map((s) => (
                    <span
                      key={s}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60"
                      style={{ width: s, height: s }}
                    />
                  ))}
                  <span className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
                </span>
                <span className="relative z-10 mt-8 text-[10px] text-white/80">40 messy rows, one click</span>
              </button>
            </div>
          </div>

          {error && (
            <div role="alert" className="rounded-2xl bg-hot/10 px-4 py-3 text-sm text-hot">
              {error}
            </div>
          )}

          {loading && (
            <div className="card flex items-center gap-3 p-5 text-sm text-ink-2">
              <span className="size-3 animate-ping rounded-full bg-ink" />
              Cleaning, deduplicating and scoring with Claude…
            </div>
          )}

          {view === "rubric" ? (
            <RubricView />
          ) : result ? (
            <>
              <ScoreStrip leads={result.leads} />

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <HeroCard className="mesh-green" label="Average lead score" value={avgScore} caption="of 100, excluding junk" />
                <HeroCard
                  className="mesh-orange"
                  label="Hot accounts"
                  value={hotCount}
                  caption={`${scored.length ? Math.round((hotCount / scored.length) * 100) : 0}% of clean leads`}
                />
                <div className="md:col-span-2 xl:col-span-1">
                  <FlowCard vars={flowVars} onChange={setFlowVars} outcomes={rows.map((r) => r.flow)} />
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
                <div>
                  <SectionTitle title="Breakdown" sub="Where the list stands after cleaning" />
                  <Breakdown leads={result.leads} />
                </div>
                <div>
                  <SectionTitle
                    title="Call first"
                    sub="Highest-scoring leads and why"
                    action={<PillButton onClick={() => setFilter("Hot")}>See all</PillButton>}
                  />
                  <div className="grid gap-3 sm:grid-cols-3">
                    {rows.slice(0, 3).map(({ lead, flow }) => (
                      <div key={lead.id} className="card flex flex-col p-4">
                        <div className="flex items-start justify-between">
                          <TierChip tier={lead.tier} />
                          <span className="font-dot text-3xl font-bold leading-none">{lead.score}</span>
                        </div>
                        <p className="mt-4 text-sm font-medium">
                          {lead.firstName} {lead.lastName}
                        </p>
                        <p className="text-[11px] text-ink-3">
                          {lead.title} · {lead.company}
                        </p>
                        <p className="mt-2 text-[11px] leading-snug text-ink-2">{lead.reason}</p>
                        <p className="mt-auto pt-3 text-[10px] text-ink-3">→ {flow.owner}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <section className="card p-4 sm:p-6">
                <SectionTitle
                  title={filter === "All" ? "Ranked leads" : `${filter} leads`}
                  sub={`${visible.length} leads · scored by Claude, routed by the flow above`}
                  action={
                    <PillButton dark onClick={() => setGateOpen(true)}>
                      Download CSV
                    </PillButton>
                  }
                />
                <LeadTable rows={visible} />
              </section>
            </>
          ) : (
            !loading && <EmptyState onSample={trySample} />
          )}

          <footer className="flex flex-col gap-2 border-t border-line pt-4 text-[11px] text-ink-3 sm:flex-row sm:justify-between">
            <span>Your uploaded data is processed in memory and never stored. Sample data is fictional.</span>
            <span>Next.js · Claude Haiku · Vercel · Salesforce Flow logic</span>
          </footer>
        </main>
      </div>

      {gateOpen && result && (
        <GateModal
          stats={{ rowsIn: result.kpis.rowsIn, hot: hotCount }}
          onDownload={downloadCsv}
          onClose={() => setGateOpen(false)}
        />
      )}
    </div>
  );
}

function Kpi({
  value,
  label,
  tag,
  tone = "lime",
  suffix = "",
}: {
  value?: number;
  label: string;
  tag: string;
  tone?: "lime" | "gray";
  suffix?: string;
}) {
  return (
    <div>
      <div className="flex items-start gap-1.5">
        <span className="font-dot text-3xl font-medium leading-none sm:text-4xl">
          {value == null ? "--" : `${value}${suffix}`}
        </span>
        <Tag tone={tone}>{tag}</Tag>
      </div>
      <p className="mt-1.5 text-[11px] text-ink-3">{label}</p>
    </div>
  );
}

function HeroCard({ className, label, value, caption }: { className: string; label: string; value: number; caption: string }) {
  return (
    <div className={`${className} relative flex min-h-56 flex-col items-center justify-center overflow-hidden rounded-[28px] p-5 text-white`}>
      <p className="absolute top-5 text-xs text-white/85">{label}</p>
      <p className="font-dot text-7xl font-bold leading-none drop-shadow-sm">{value}</p>
      <p className="mt-2 text-[11px] text-white/85">{caption}</p>
      <div className="ticks absolute inset-x-6 bottom-5 h-4 opacity-70" aria-hidden />
    </div>
  );
}

function EmptyState({ onSample }: { onSample: () => void }) {
  const steps = [
    ["Parse", "Reads any CSV export, maps common column names."],
    ["Clean", "Normalizes casing, cities and countries, merges duplicates, flags junk."],
    ["Score", "One batched Claude Haiku call scores every lead against the rubric."],
    ["Route", "A Salesforce-style Flow assigns queues and creates follow-up tasks."],
  ];
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="mesh-green relative flex min-h-56 flex-col justify-end overflow-hidden rounded-[28px] p-6 text-white">
          <p className="font-dot text-6xl font-bold leading-none">100</p>
          <p className="mt-3 text-sm">rows per upload, scored in one AI call</p>
        </div>
        <div className="mesh-orange relative flex min-h-56 flex-col justify-end overflow-hidden rounded-[28px] p-6 text-white">
          <p className="font-dot text-6xl font-bold leading-none">4</p>
          <p className="mt-3 text-sm">tiers: Hot, Warm, Nurture, Disqualify</p>
        </div>
        <div className="card flex flex-col justify-between p-6">
          <p className="text-sm text-ink-2">No list handy? Run the sample: duplicates, &quot;TLV&quot; vs &quot;Tel Aviv&quot;, test junk and all.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <PillButton dark onClick={onSample}>
              Run sample
            </PillButton>
            <a href="/sample-leads.csv" download className="rounded-full bg-white px-4 py-2 text-xs font-medium ring-1 ring-line">
              Download sample CSV
            </a>
          </div>
        </div>
      </div>
      <div>
        <SectionTitle title="How it works" sub="Four steps, one request" />
        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {steps.map(([t, d], i) => (
            <li key={t} className="card p-5">
              <span className="font-dot text-2xl font-bold text-ink-3">0{i + 1}</span>
              <p className="mt-3 text-sm font-medium">{t}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-2">{d}</p>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}

function RubricView() {
  const criteria: [string, number, string[]][] = [
    [rubric.companySize.label, rubric.companySize.weight, rubric.companySize.bands.map((b) => `${b.band} employees: ${b.points}`)],
    [rubric.seniority.label, rubric.seniority.weight, rubric.seniority.levels.map((l) => `${l.level}: ${l.points}`)],
    [rubric.industry.label, rubric.industry.weight, rubric.industry.tiers.map((t) => `${t.match.join(", ")}: ${t.points}`)],
    [rubric.region.label, rubric.region.weight, rubric.region.tiers.map((t) => `${t.match.join(", ")}: ${t.points}`)],
    [rubric.intent.label, rubric.intent.weight, rubric.intent.signals.map((s) => `${s.signal}: ${s.points}`)],
    [rubric.completeness.label, rubric.completeness.weight, [rubric.completeness.rule]],
  ];
  return (
    <div className="space-y-4">
      <SectionTitle
        title="Scoring rubric"
        sub="Transparent logic, applied by AI. Points add up to 100; tier comes from the total."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {criteria.map(([label, weight, items]) => (
          <div key={label} className="card p-5">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-medium">{label}</p>
              <span className="font-dot text-2xl font-bold">{weight}</span>
            </div>
            <ul className="mt-3 space-y-1 text-[11px] text-ink-2">
              {items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="card flex flex-wrap gap-3 p-5">
        {rubric.tiers.map((t) => (
          <span key={t.tier} className="flex items-center gap-2 text-xs">
            <TierChip tier={t.tier} />
            <span className="text-ink-3">{t.min}+</span>
          </span>
        ))}
      </div>
    </div>
  );
}
