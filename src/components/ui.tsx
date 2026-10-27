import type { Tier } from "@/config/rubric";

export const TIERS: Tier[] = ["Hot", "Warm", "Nurture", "Disqualify"];

export const tierColor: Record<Tier, string> = {
  Hot: "var(--tier-hot)",
  Warm: "var(--tier-warm)",
  Nurture: "var(--tier-nurture)",
  Disqualify: "var(--tier-disqualify)",
};

export function TierChip({ tier }: { tier: Tier }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink ring-1 ring-line">
      <span className="size-2 rounded-full" style={{ background: tierColor[tier] }} />
      {tier}
    </span>
  );
}

export function Tag({ children, tone = "lime" }: { children: React.ReactNode; tone?: "lime" | "gray" }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium leading-4 ${
        tone === "lime" ? "bg-lime text-ink" : "bg-white text-ink-2 ring-1 ring-line"
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
        <h2 className="text-xl font-normal tracking-tight">{title}</h2>
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
