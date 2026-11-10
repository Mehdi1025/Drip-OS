"use client";

import { useMemo, useState } from "react";
import type { DailyCount } from "@/lib/stats/types";

type Range = 7 | 30;

type SeriesKey = "orders" | "shipped" | "lots" | "sheets";

const SERIES: Record<
  SeriesKey,
  { label: string; className: string }
> = {
  orders: { label: "Commandes", className: "bg-drip-volt" },
  shipped: { label: "Expédiés", className: "bg-drip-success" },
  lots: { label: "Lots", className: "bg-drip-peach" },
  sheets: { label: "Feuilles", className: "bg-drip-lilac" },
};

function ChartBlock({
  title,
  data,
  keys,
}: {
  title: string;
  data: DailyCount[];
  keys: SeriesKey[];
}) {
  const max = Math.max(
    1,
    ...data.flatMap((d) => keys.map((k) => d[k]))
  );

  return (
    <article className="drip-card p-5">
      <h3 className="text-xs font-medium tracking-widest text-drip-muted">
        {title}
      </h3>
      <div className="mt-3 flex flex-wrap gap-3 text-[10px] font-medium uppercase text-drip-muted">
        {keys.map((k) => (
          <span key={k} className="flex items-center gap-1">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-sm ${SERIES[k].className}`}
            />
            {SERIES[k].label}
          </span>
        ))}
      </div>
      <div className="mt-4 flex items-end gap-px overflow-x-auto pb-1 sm:gap-0.5">
        {data.map((day) => (
          <div
            key={day.date}
            className="flex min-w-[18px] flex-1 flex-col items-center gap-0.5 sm:min-w-0"
          >
            <div className="flex h-20 w-full items-end justify-center gap-px sm:h-28">
              {keys.map((k) => (
                <div
                  key={k}
                  className={`w-[45%] max-w-[14px] rounded-t ${SERIES[k].className}`}
                  style={{
                    height: `${Math.max((day[k] / max) * 100, day[k] > 0 ? 6 : 0)}%`,
                  }}
                  title={`${SERIES[k].label} · ${day.label} : ${day[k]}`}
                />
              ))}
            </div>
            {data.length <= 10 ? (
              <span className="truncate text-center text-[8px] font-medium text-drip-muted sm:text-[9px]">
                {day.label}
              </span>
            ) : (
              <span className="truncate text-center text-[7px] text-drip-muted">
                {day.date.slice(8)}
              </span>
            )}
          </div>
        ))}
      </div>
    </article>
  );
}

type Props = {
  data: DailyCount[];
};

export function StatsTrendSection({ data }: Props) {
  const [range, setRange] = useState<Range>(7);

  const slice = useMemo(
    () => (range === 7 ? data.slice(-7) : data),
    [data, range]
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-medium tracking-widest text-drip-muted">
          Tendances
        </h2>
        <div className="flex rounded-lg border border-drip-border p-0.5">
          {([7, 30] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition ${
                range === r
                  ? "bg-drip-volt/20 text-drip-ink"
                  : "text-drip-muted hover:text-drip-ink"
              }`}
            >
              {r} jours
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartBlock
          title="Flux commandes"
          data={slice}
          keys={["orders", "shipped"]}
        />
        <ChartBlock
          title="Production"
          data={slice}
          keys={["lots", "sheets"]}
        />
      </div>
    </section>
  );
}
