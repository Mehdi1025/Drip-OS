import Link from "next/link";
import { BrutalBarChart } from "@/components/stats/BrutalBarChart";
import { DualTrendChart } from "@/components/stats/DualTrendChart";
import { PipelineStrip } from "@/components/stats/PipelineStrip";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { StatBadge } from "@/components/layout/StatBadge";
import type { AdvancedStatsPayload, SkinStatusKey } from "@/lib/stats/types";

const STATUS_LABELS: Record<SkinStatusKey, string> = {
  pending: "En attente",
  imposed: "Imposé",
  printed: "Imprimé",
  cut: "Découpé (OK)",
  shipped: "Expédié",
  scrap: "Rebut",
};

type Props = {
  stats: AdvancedStatsPayload;
};

export function StatsDashboard({ stats }: Props) {
  const updated = new Date(stats.generatedAt).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  const statusBars = (
    Object.entries(stats.skinsByStatus) as [SkinStatusKey, number][]
  ).map(([key, value]) => ({
    label: STATUS_LABELS[key],
    value,
    tone:
      key === "shipped"
        ? ("ink" as const)
        : key === "scrap"
          ? ("danger" as const)
          : key === "pending"
            ? ("volt" as const)
            : ("muted" as const),
  }));

  const pipelineSteps = [
    {
      label: "File",
      value: stats.skinsByStatus.pending + stats.skinsByStatus.scrap,
      hint: "Imposition",
    },
    {
      label: "Imposé",
      value: stats.skinsByStatus.imposed,
      hint: "Feuilles prêtes",
    },
    {
      label: "Atelier",
      value: stats.skinsByStatus.printed + stats.skinsByStatus.cut,
      hint: "Contrôle / découpe",
    },
    {
      label: "Expédié",
      value: stats.skinsByStatus.shipped,
      hint: "Terminé client",
    },
    {
      label: "Rebut",
      value: stats.skinsByStatus.scrap,
      hint: "À refaire",
    },
  ];

  return (
    <DashboardShell
      kicker="Pilotage · Analytics"
      title="Statistiques"
      stats={
        <>
          <StatBadge label="Commandes" value={stats.totals.orders} variant="volt" />
          <StatBadge label="Skins total" value={stats.totals.skins} />
          <StatBadge label="Lots" value={stats.totals.lots} />
          <div className="drip-stat min-w-[108px] bg-drip-surface sm:min-w-[120px]">
            <p className="truncate text-[9px] font-black uppercase tracking-widest text-drip-ink/55 sm:text-[10px]">
              Taux expédition
            </p>
            <p className="font-mono text-2xl font-black leading-none sm:text-3xl">
              {stats.kpis.shippedRatePct}%
            </p>
          </div>
        </>
      }
    >
      <p className="mb-6 text-xs font-medium text-drip-ink/50">
        Données live Supabase · MAJ {updated}
      </p>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="drip-card p-5 lg:col-span-1">
          <h2 className="text-xs font-black uppercase tracking-widest text-drip-ink/55">
            KPIs
          </h2>
          <dl className="mt-4 space-y-4">
            <div className="flex justify-between border-b-2 border-drip-ink/15 pb-2">
              <dt className="text-sm font-bold">Expédition</dt>
              <dd className="font-mono text-xl font-black">
                {stats.kpis.shippedRatePct}%
              </dd>
            </div>
            <div className="flex justify-between border-b-2 border-drip-ink/15 pb-2">
              <dt className="text-sm font-bold">Rebut</dt>
              <dd className="font-mono text-xl font-black text-red-700">
                {stats.kpis.scrapRatePct}%
              </dd>
            </div>
            <div className="flex justify-between border-b-2 border-drip-ink/15 pb-2">
              <dt className="text-sm font-bold">Skins / commande</dt>
              <dd className="font-mono text-xl font-black">
                {stats.kpis.avgSkinsPerOrder}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-bold">Prêts à ship</dt>
              <dd className="font-mono text-xl font-black">
                {stats.kpis.readyToShip}
              </dd>
            </div>
          </dl>
        </div>

        <div className="lg:col-span-2">
          <DualTrendChart title="7 derniers jours" data={stats.ordersLast7Days} />
        </div>
      </div>

      <div className="mt-6">
        <PipelineStrip steps={pipelineSteps} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <BrutalBarChart title="Skins par statut" bars={statusBars} />

        <BrutalBarChart
          title="Rebuts par cause"
          bars={stats.scrapBreakdown.map((s) => ({
            label: s.label,
            value: s.count,
            tone: s.count > 0 ? "danger" : "muted",
          }))}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="drip-card p-5">
          <h2 className="text-xs font-black uppercase tracking-widest text-drip-ink/55">
            Stock consommables
          </h2>
          {stats.inventory.length === 0 ? (
            <p className="mt-4 text-sm font-medium text-drip-ink/50">
              Aucune ligne inventaire (migration 004).
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {stats.inventory.map((item) => (
                <li
                  key={item.id}
                  className={`border-4 border-drip-ink px-4 py-3 ${
                    item.low ? "bg-red-100" : "bg-drip-surface"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black uppercase">{item.name}</span>
                    <span className="font-mono text-lg font-black">
                      {item.current} {item.unit}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-drip-ink/55">
                    Seuil alerte : {item.threshold} {item.unit}
                    {item.low ? " · ⚠ bas" : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/inventory"
            className="mt-4 inline-block text-xs font-black uppercase underline"
          >
            Ouvrir Smart Restock →
          </Link>
        </article>

        <article className="drip-card p-5">
          <h2 className="text-xs font-black uppercase tracking-widest text-drip-ink/55">
            Derniers lots
          </h2>
          {stats.recentLots.length === 0 ? (
            <p className="mt-4 text-sm font-medium text-drip-ink/50">
              Aucun lot généré pour l&apos;instant.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {stats.recentLots.map((lot) => (
                <li
                  key={lot.lotId}
                  className="flex items-center justify-between border-2 border-drip-ink bg-drip-paper px-3 py-2"
                >
                  <Link
                    href={`/workshop`}
                    className="font-mono font-black hover:underline"
                  >
                    {lot.lotId}
                  </Link>
                  <span className="text-xs font-bold text-drip-ink/60">
                    {lot.skinCount} skins ·{" "}
                    {new Date(lot.createdAt).toLocaleDateString("fr-FR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs font-medium text-drip-ink/45">
            {stats.totals.sheets} feuille(s) enregistrée(s) au total.
          </p>
        </article>
      </div>

      <div className="mt-8 flex flex-wrap gap-2 border-4 border-dashed border-drip-ink/30 bg-drip-volt/20 p-4 sm:gap-3">
        <QuickLink href="/imposition" label="Imposition" />
        <QuickLink href="/workshop" label="Atelier" />
        <QuickLink href="/scanner" label="Scanner" />
        <QuickLink href="/inventory" label="Stock" />
      </div>
    </DashboardShell>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="drip-touch border-4 border-drip-ink bg-drip-surface px-3 py-2.5 text-[10px] font-black uppercase shadow-brutal-sm hover:bg-drip-volt sm:px-4 sm:text-xs"
    >
      {label}
    </Link>
  );
}
