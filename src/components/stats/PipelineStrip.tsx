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
      <div className="border-b-4 border-drip-ink bg-drip-volt px-5 py-3">
        <h2 className="text-xs font-black uppercase tracking-widest">
          Pipeline production
        </h2>
      </div>
      <div className="flex h-14 w-full border-b-4 border-drip-ink">
        {steps.map((step, i) => {
          const widthPct = (step.value / total) * 100;
          const shades = [
            "bg-drip-volt/90",
            "bg-drip-volt/60",
            "bg-drip-ink/20",
            "bg-drip-ink/45",
            "bg-drip-ink",
          ];
          return (
            <div
              key={step.label}
              className={`relative border-r-4 border-drip-ink last:border-r-0 ${shades[i] ?? "bg-drip-surface"}`}
              style={{ width: `${Math.max(widthPct, step.value > 0 ? 6 : 0)}%` }}
              title={`${step.label}: ${step.value}`}
            />
          );
        })}
      </div>
      <ul className="grid grid-cols-2 gap-3 p-4 sm:p-5 lg:grid-cols-5">
        {steps.map((step) => (
          <li key={step.label}>
            <p className="text-[10px] font-black uppercase tracking-widest text-drip-ink/50">
              {step.label}
            </p>
            <p className="font-mono text-2xl font-black">{step.value}</p>
            <p className="text-xs font-medium text-drip-ink/55">{step.hint}</p>
          </li>
        ))}
      </ul>
    </article>
  );
}
