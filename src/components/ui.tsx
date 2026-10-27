import type { Tier } from "@/config/rubric";

export const LINKEDIN_URL = "https://www.linkedin.com/in/ariellaish";
export const GITHUB_URL = "https://github.com/arielslaish/leadwise";

export const TIERS: Tier[] = ["Hot", "Warm", "Nurture", "Disqualify"];

export const tierColor: Record<Tier, string> = {
  Hot: "var(--tier-hot)",
  Warm: "var(--tier-warm)",
  Nurture: "var(--tier-nurture)",
  Disqualify: "var(--tier-disqualify)",
};

export function Logo({ light }: { light?: boolean }) {
  return (
    <span className={`flex items-center gap-2 font-display text-lg font-semibold tracking-tight ${light ? "text-white" : "text-ink"}`}>
      <span aria-hidden className="grid size-6 place-items-center rounded-lg bg-gradient-to-br from-iris to-ember text-[11px] font-bold text-white">
        L
      </span>
      leadwise
    </span>
  );
}

export function TierChip({ tier }: { tier: Tier }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink ring-1 ring-line">
      <span className="size-2 rounded-full" style={{ background: tierColor[tier] }} />
      {tier}
    </span>
  );
}

export function Tag({ children, tone = "iris" }: { children: React.ReactNode; tone?: "iris" | "gray" }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium leading-4 ${
        tone === "iris" ? "bg-iris-soft text-iris" : "bg-white text-ink-2 ring-1 ring-line"
      }`}
    >
      {children}
    </span>
  );
}

export function SectionTitle({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-xl font-medium tracking-tight">{title}</h2>
        {sub && <p className="mt-0.5 text-xs text-ink-3">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function PillButton({
  children,
  onClick,
  dark,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  dark?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-4 py-2 text-xs font-medium transition disabled:opacity-40 ${
        dark ? "bg-ink text-white hover:bg-ink/85" : "bg-white text-ink ring-1 ring-line hover:bg-white/70"
      }`}
    >
      {children}
    </button>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 flex flex-col items-center gap-3 border-t border-line px-4 py-8 text-center text-xs text-ink-3 sm:flex-row sm:justify-between sm:text-left">
      <span>
        Made by{" "}
        <a href={LINKEDIN_URL} target="_blank" rel="noreferrer" className="font-medium text-ink underline-offset-4 hover:underline">
          Ariel Laish
        </a>
        . Uploaded data is processed in memory and never stored. Sample data is fictional.
      </span>
      <span className="flex gap-4">
        <a href={LINKEDIN_URL} target="_blank" rel="noreferrer" className="hover:text-ink">
          LinkedIn
        </a>
        <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-ink">
          GitHub
        </a>
      </span>
    </footer>
  );
}
