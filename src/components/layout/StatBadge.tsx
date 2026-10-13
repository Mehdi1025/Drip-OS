type Props = {
  label: string;
  value: number;
  variant?: "default" | "volt" | "danger";
};

export function StatBadge({ label, value, variant = "default" }: Props) {
  const bg =
    variant === "volt"
      ? "bg-drip-volt"
      : variant === "danger"
        ? "bg-red-100"
        : "bg-drip-surface";

  return (
    <div className={`drip-stat min-w-[120px] ${bg}`}>
      <p className="text-[10px] font-black uppercase tracking-widest text-drip-ink/55">
        {label}
      </p>
      <p className="font-mono text-3xl font-black leading-none">{value}</p>
    </div>
  );
}
