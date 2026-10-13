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
    <div className={`drip-stat min-w-[100px] flex-1 sm:min-w-[120px] sm:flex-none sm:max-w-none ${bg}`}>
      <p className="truncate text-[9px] font-black uppercase tracking-widest text-drip-ink/55 sm:text-[10px]">
        {label}
      </p>
      <p className="font-mono text-2xl font-black leading-none sm:text-3xl">
        {value}
      </p>
    </div>
  );
}
