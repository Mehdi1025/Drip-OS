type Step = {
  label: string;
  value: number;
  hint: string;
};

type Props = {
  steps: Step[];
};

export function PipelineStrip({ steps }: Props) {
  const total = steps.reduce((a, s) => a + s.value, 0) || 1;

  return (
    <article className="drip-card overflow-hidden p-0">
      <div className="border-b border-drip-border bg-drip-volt/15 px-5 py-3">
        <h2 className="text-xs font-medium tracking-widest text-drip-lilac">
          Pipeline production
        </h2>
      </div>
      <div className="flex h-14 w-full border-b border-drip-border">
        {steps.map((step, i) => {
          const widthPct = (step.value / total) * 100;
          const shades = [
            "bg-drip-volt",
            "bg-drip-volt/70",
            "bg-drip-peach/80",
            "bg-drip-peach/45",
            "bg-drip-elevated",
          ];
          return (
            <div
              key={step.label}
              className={`relative border-r border-drip-border/50 last:border-r-0 ${shades[i] ?? "bg-drip-surface"}`}
              style={{ width: `${Math.max(widthPct, step.value > 0 ? 6 : 0)}%` }}
              title={`${step.label}: ${step.value}`}
            />
          );
        })}
      </div>
      <ul className="grid grid-cols-2 gap-3 p-4 sm:p-5 lg:grid-cols-5">
        {steps.map((step) => (
          <li key={step.label}>
            <p className="text-[10px] font-medium tracking-widest text-drip-muted">
              {step.label}
            </p>
            <p className="font-mono text-2xl font-semibold tabular-nums">
              {step.value}
            </p>
            <p className="text-xs text-drip-gray-text">{step.hint}</p>
          </li>
        ))}
      </ul>
    </article>
  );
}
