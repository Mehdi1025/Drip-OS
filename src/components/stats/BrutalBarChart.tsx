type Bar = {
  label: string;
  value: number;
  subLabel?: string;
  tone?: "volt" | "ink" | "muted" | "danger";
};

type Props = {
  title: string;
  bars: Bar[];
  maxValue?: number;
};

const TONE_CLASS: Record<NonNullable<Bar["tone"]>, string> = {
  volt: "bg-drip-volt",
  ink: "bg-drip-ink",
  muted: "bg-drip-ink/25",
  danger: "bg-red-400",
};

export function BrutalBarChart({ title, bars, maxValue }: Props) {
  const max =
    maxValue ?? Math.max(1, ...bars.map((b) => b.value));

  return (
    <article className="drip-card p-5">
      <h2 className="text-xs font-black uppercase tracking-widest text-drip-ink/55">
        {title}
      </h2>
      <ul className="mt-4 space-y-3">
        {bars.map((bar) => {
          const pct = max > 0 ? (bar.value / max) * 100 : 0;
          const tone = bar.tone ?? "volt";
          return (
            <li key={bar.label}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <span className="font-bold uppercase tracking-wide">
                  {bar.label}
                </span>
                <span className="font-mono text-lg font-black">{bar.value}</span>
              </div>
              <div className="h-4 border-2 border-drip-ink bg-drip-paper">
                <div
                  className={`h-full border-r-2 border-drip-ink transition-all ${TONE_CLASS[tone]}`}
                  style={{ width: `${Math.max(pct, bar.value > 0 ? 4 : 0)}%` }}
                />
              </div>
              {bar.subLabel && (
                <p className="mt-0.5 text-[10px] font-medium text-drip-ink/45">
                  {bar.subLabel}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </article>
  );
}
