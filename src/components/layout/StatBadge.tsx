type Props = {
  label: string;
  value: number;
  variant?: "default" | "volt" | "danger";
};

export function StatBadge({ label, value, variant = "default" }: Props) {
  const shell =
    variant === "volt"
      ? "drip-stat-volt border-drip-volt/30"
      : variant === "danger"
        ? "border-red-500/25 bg-red-500/10"
        : "drip-stat";

  const valueColor =
    variant === "volt"
      ? "text-drip-volt"
      : variant === "danger"
        ? "text-red-300"
        : "text-drip-ink";

  return (
    <div
      className={`${shell} min-w-[108px] flex-1 sm:min-w-[128px] sm:flex-none sm:max-w-none`}
    >
      <p className="truncate text-[10px] font-medium uppercase tracking-widest text-drip-muted">
        {label}
      </p>
      <p
        className={`font-mono text-2xl font-semibold leading-none tabular-nums sm:text-3xl ${valueColor}`}
      >
        {value}
      </p>
    </div>
  );
}
