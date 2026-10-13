import type { DailyCount } from "@/lib/stats/types";

type Props = {
  title: string;
  data: DailyCount[];
};

export function DualTrendChart({ title, data }: Props) {
  const maxOrders = Math.max(1, ...data.map((d) => d.orders));
  const maxShipped = Math.max(1, ...data.map((d) => d.shipped));
  const max = Math.max(maxOrders, maxShipped);

  return (
    <article className="drip-card p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-xs font-black uppercase tracking-widest text-drip-ink/55">
          {title}
        </h2>
        <div className="flex gap-3 text-[10px] font-bold uppercase">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 border border-drip-ink bg-drip-volt" />
            Commandes
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 border border-drip-ink bg-drip-ink" />
            Expédiés
          </span>
        </div>
      </div>

      <div className="mt-6 flex items-end justify-between gap-1 sm:gap-2">
        {data.map((day) => (
          <div
            key={day.date}
            className="flex min-w-0 flex-1 flex-col items-center gap-1"
          >
            <div className="flex h-32 w-full items-end justify-center gap-0.5 sm:gap-1">
              <div
                className="w-[42%] border-2 border-drip-ink bg-drip-volt"
                style={{
                  height: `${Math.max((day.orders / max) * 100, day.orders > 0 ? 8 : 0)}%`,
                }}
                title={`${day.orders} commande(s)`}
              />
              <div
                className="w-[42%] border-2 border-drip-ink bg-drip-ink"
                style={{
                  height: `${Math.max((day.shipped / max) * 100, day.shipped > 0 ? 8 : 0)}%`,
                }}
                title={`${day.shipped} expédié(s)`}
              />
            </div>
            <span className="truncate text-center text-[9px] font-bold uppercase sm:text-[10px]">
              {day.label}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}
