"use client";

// Results dashboard: full-width, scrollable, stacked on mobile.

import Papa from "papaparse";
import { useMemo, useState } from "react";
import type { Tier } from "@/config/rubric";
import { defaultFlowVariables, runLeadFlow, type FlowVariables } from "@/lib/flow";
import { Breakdown } from "./Breakdown";
import { FlowCard } from "./FlowCard";
import { GateModal } from "./GateModal";
import { LeadTable } from "./LeadTable";
import { ScoreStrip } from "./ScoreStrip";
import { Footer, LINKEDIN_URL, Logo, PillButton, SectionTitle, Tag, TIERS, TierChip, tierColor } from "./ui";
import type { ScoreResponse } from "./types";

export function Results({ result, fileName, onReset }: { result: ScoreResponse; fileName: string; onReset: () => void }) {
  const [filter, setFilter] = useState<Tier | "All">("All");
  const [flowVars, setFlowVars] = useState<FlowVariables>(defaultFlowVariables);
  const [gateOpen, setGateOpen] = useState(false);

  const rows = useMemo(() => result.leads.map((lead) => ({ lead, flow: runLeadFlow(lead, flowVars) })), [result, flowVars]);
  const hotCount = rows.filter((r) => r.flow.route === "Hot").length;
  const scored = rows.filter((r) => r.lead.tier !== "Disqualify");
  const avgScore = scored.length ? Math.round(scored.reduce((s, r) => s + r.lead.score, 0) / scored.length) : 0;
  const visible = filter === "All" ? rows : rows.filter((r) => r.lead.tier === filter);
  const tierCounts = new Map<Tier, number>();
  for (const r of rows) tierCounts.set(r.lead.tier, (tierCounts.get(r.lead.tier) ?? 0) + 1);

  function showTier(t: Tier | "All") {
    setFilter(t);
    document.getElementById("ranked")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
              Download CSV
            </PillButton>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-[1600px] space-y-6 px-4 pb-4 pt-6 sm:px-8 sm:pt-10">
        <header className="rise flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs text-ink-3">{fileName}</p>
            <h1 className="mt-1 font-display text-4xl font-medium tracking-tight sm:text-5xl">Who to call first</h1>
            {result.kpis.truncatedFrom && (
              <p className="mt-2 text-xs text-ink-2">
                Your file had {result.kpis.truncatedFrom} rows; the first 100 were scored.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
            <Kpi value={result.kpis.rowsIn} label="Rows in" tag="Raw" />
            <Kpi value={result.kpis.duplicatesRemoved} label="Duplicates merged" tag="Cleaned" tone="gray" />
            <Kpi value={hotCount} label="Hot accounts" tag="Call now" />
            <Kpi value={result.kpis.repHoursSaved} label="Rep hours saved" tag="Est." tone="gray" suffix="h" />
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
              <span className="size-2 rounded-full" style={{ background: t === "All" ? "var(--iris)" : tierColor[t] }} />
              {t === "All" ? "All leads" : t}
              <span className={`tabular-nums ${filter === t ? "text-white/60" : "text-ink-3"}`}>
                {t === "All" ? rows.length : (tierCounts.get(t) ?? 0)}
              </span>
            </button>
          ))}
        </div>

        <ScoreStrip leads={result.leads} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <HeroCard className="grad-iris" label="Average lead score" value={avgScore} caption="of 100, excluding junk" />
          <HeroCard
            className="grad-ember"
            label="Hot accounts"
            value={hotCount}
            caption={`${scored.length ? Math.round((hotCount / scored.length) * 100) : 0}% of clean leads`}
          />
          <div className="md:col-span-2 xl:col-span-1">
            <FlowCard vars={flowVars} onChange={setFlowVars} outcomes={rows.map((r) => r.flow)} />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1.3fr]">
          <div>
            <SectionTitle title="Breakdown" sub="Where the list stands after cleaning" />
            <Breakdown leads={result.leads} />
          </div>
          <div>
            <SectionTitle
              title="Call first"
              sub="Highest-scoring leads and why"
              action={<PillButton onClick={() => showTier("Hot")}>See all Hot</PillButton>}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              {rows.slice(0, 3).map(({ lead, flow }) => (
                <div key={lead.id} className="card flex flex-col p-5">
                  <div className="flex items-start justify-between">
                    <TierChip tier={lead.tier} />
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

        <section id="ranked" className="card scroll-mt-20 p-4 sm:p-6">
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

        <div className="grad-dusk flex flex-col items-start justify-between gap-4 rounded-[28px] p-6 text-white sm:flex-row sm:items-center sm:p-8">
          <div>
            <p className="font-display text-2xl font-medium">Want this running on your own pipeline?</p>
            <p className="mt-1 text-sm text-white/70">Built by Ariel Laish: GTM engineering, RevOps and AI automation.</p>
          </div>
          <a href={LINKEDIN_URL} target="_blank" rel="noreferrer" className="rounded-full bg-white px-5 py-2.5 text-xs font-medium text-ink">
            Connect on LinkedIn
          </a>
        </div>

        <Footer />
      </main>

      {gateOpen && (
        <GateModal stats={{ rowsIn: result.kpis.rowsIn, hot: hotCount }} onDownload={downloadCsv} onClose={() => setGateOpen(false)} />
      )}
    </div>
  );
}

function Kpi({
  value,
  label,
  tag,
  tone = "iris",
  suffix = "",
}: {
  value: number;
  label: string;
  tag: string;
  tone?: "iris" | "gray";
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
