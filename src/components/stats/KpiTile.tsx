import { formatDeltaPct } from "@/lib/stats/metrics";

type Props = {
  label: string;
  value: string | number;
  hint?: string;
  deltaPct?: number | null;
  variant?: "default" | "volt" | "danger" | "success";
};

const VARIANT: Record<NonNullable<Props["variant"]>, string> = {
  default: "bg-drip-surface",
  volt: "bg-drip-volt/10 border-drip-volt/25",
  danger: "bg-red-500/10 border-red-500/25",
  success: "bg-emerald-500/10 border-emerald-500/25",
};

export function KpiTile({
  label,
  value,
  hint,
  deltaPct,
  variant = "default",
}: Props) {
  const deltaTone =
    deltaPct === null || deltaPct === undefined
      ? "text-drip-muted"
      : deltaPct >= 0
        ? "text-emerald-400"
        : "text-red-300";

  return (
    <div className={`drip-card border p-4 ${VARIANT[variant]}`}>
      <p className="text-[10px] font-medium uppercase tracking-widest text-drip-muted">
        {label}
      </p>
      <p className="mt-2 font-mono text-3xl font-semibold tabular-nums leading-none">
        {value}
      </p>
      {(hint || deltaPct !== undefined) && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-drip-muted">
          {hint && <span>{hint}</span>}
          {deltaPct !== undefined && (
            <span className={`font-mono font-medium ${deltaTone}`}>
              vs sem. prec. {formatDeltaPct(deltaPct ?? null)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
