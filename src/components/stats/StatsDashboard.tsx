import Link from "next/link";
import { BrutalBarChart } from "@/components/stats/BrutalBarChart";
import { KpiTile } from "@/components/stats/KpiTile";
import { PipelineStrip } from "@/components/stats/PipelineStrip";
import { StatsTrendSection } from "@/components/stats/StatsTrendSection";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { StatBadge } from "@/components/layout/StatBadge";
import { formatAgeHours } from "@/lib/stats/metrics";
import type { DelaisKpiSnapshot } from "@/app/delais/actions";
import { formatPercent } from "@/lib/delais/format";
import type { AdvancedStatsPayload, SkinStatusKey } from "@/lib/stats/types";

const STATUS_LABELS: Record<SkinStatusKey, string> = {
  pending: "En attente",
  imposed: "Imposé",
  planche_prete: "Planche prête",
  printed: "Imprimé",
  cut: "Découpé (OK)",
  shipped: "Expédié",
  scrap: "Rebut",
};

type Props = {
  stats: AdvancedStatsPayload;
  delais: DelaisKpiSnapshot;
};

export function StatsDashboard({ stats, delais }: Props) {
  const updated = new Date(stats.generatedAt).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  const { last7, deltas } = stats.periodComparison;
  const t7 = stats.kpis.throughput7d;

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
      value: stats.skinsByStatus.pending,
      hint: "À imposer",
    },
    {
      label: "Imposé",
      value: stats.skinsByStatus.imposed,
      hint: "Export + fichiers",
    },
    {
      label: "Planche",
      value: stats.skinsByStatus.planche_prete,
      hint: "PDF déposé",
    },
    {
      label: "Imprimé",
      value: stats.skinsByStatus.printed,
      hint: "Papier",
    },
    {
      label: "Découpé",
      value: stats.skinsByStatus.cut,
      hint: "QC OK",
    },
    {
      label: "Expédié",
      value: stats.skinsByStatus.shipped,
      hint: "Clients",
    },
    {
      label: "Rebut",
      value: stats.skinsByStatus.scrap,
      hint: "Re-imposer",
    },
  ];

  const criticalStock = stats.inventory
    .filter((i) => i.low)
    .sort((a, b) => (a.daysUntilThreshold ?? 999) - (b.daysUntilThreshold ?? 999))
    .slice(0, 5);

  return (
    <DashboardShell
      kicker="Pilotage · Temps réel"
      title="Statistiques"
      stats={
        <>
          <StatBadge label="Commandes" value={stats.totals.orders} variant="volt" />
          <StatBadge label="Skins" value={stats.totals.skins} />
          <StatBadge
            label="Alertes stock"
            value={stats.inventoryAlertCount}
            variant={stats.inventoryAlertCount > 0 ? "danger" : "default"}
          />
          <StatBadge label="7j expédiés" value={t7.shipped} variant="success" />
        </>
      }
    >
      <p className="mb-6 text-xs font-medium text-drip-ink/50">
        Données live Supabase · MAJ {updated}
      </p>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Link
          href="/delais"
          className="drip-card flex flex-col gap-1 border-drip-violet/30 p-4 transition hover:border-drip-violet"
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-drip-muted">
            % sous 48 h (7 j)
          </span>
          <span className="font-mono text-2xl font-semibold text-drip-violet">
            {formatPercent(delais.pctUnder48_7d)}
          </span>
        </Link>
        <Link
          href="/delais"
          className="drip-card flex flex-col gap-1 border-drip-peach/40 p-4 transition hover:border-drip-peach"
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-drip-muted">
            Commandes en retard
          </span>
          <span
            className={`font-mono text-2xl font-semibold ${
              delais.overdueCount > 0 ? "text-red-600" : "text-drip-ink"
            }`}
          >
            {delais.overdueCount}
          </span>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiTile
          label="Commandes (7 j)"
          value={last7.orders}
          deltaPct={deltas.orders}
          variant="volt"
        />
        <KpiTile
          label="Expéditions (7 j)"
          value={last7.shipped}
          hint={`Taux flux ${stats.production.fillRatePct}%`}
          deltaPct={deltas.shipped}
          variant="success"
        />
        <KpiTile
          label="Lots / feuilles (7 j)"
          value={`${last7.lots} / ${last7.sheets}`}
          deltaPct={deltas.lots}
        />
        <KpiTile
          label="Réimpressions (7 j)"
          value={stats.production.reprintsLast7Days}
        />
        <KpiTile
          label="Rebut (7 j)"
          value={last7.scrap}
          hint={`${stats.kpis.scrapRatePct}% du stock skins total`}
          variant={last7.scrap > 0 ? "danger" : "default"}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <article className="drip-card p-5 lg:col-span-1">
          <h2 className="text-xs font-medium tracking-widest text-drip-muted">
            Santé production
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-2 border-b border-drip-border pb-2">
              <dt className="text-drip-muted">File la plus ancienne</dt>
              <dd className="font-mono font-semibold">
                {formatAgeHours(stats.production.oldestPendingAgeHours)}
              </dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-drip-border pb-2">
              <dt className="text-drip-muted">Commandes à terminer</dt>
              <dd className="font-mono font-semibold">
                {stats.production.ordersAwaitingShipment}
              </dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-drip-border pb-2">
              <dt className="text-drip-muted">Skins / feuille</dt>
              <dd className="font-mono font-semibold">
                {stats.production.skinsPerSheet}
              </dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-drip-border pb-2">
              <dt className="text-drip-muted">Prêts à expédier</dt>
              <dd className="font-mono font-semibold text-drip-peach">
                {stats.kpis.readyToShip}
              </dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-drip-border pb-2">
              <dt className="text-drip-muted">Feuilles sans fichier &gt; 12 h</dt>
              <dd
                className={`font-mono font-semibold ${
                  stats.production.sheetsWithoutFileOver12h > 0
                    ? "text-red-400"
                    : ""
                }`}
              >
                {stats.production.sheetsWithoutFileOver12h}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-drip-muted">Pending &gt; 24 h</dt>
              <dd
                className={`font-mono font-semibold ${
                  stats.production.pendingOver24h > 0 ? "text-red-400" : ""
                }`}
              >
                {stats.production.pendingOver24h}
              </dd>
            </div>
          </dl>
        </article>

        <article className="drip-card p-5 lg:col-span-2">
          <h2 className="text-xs font-medium tracking-widest text-drip-muted">
            Performance globale
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MiniMetric
              label="Taux expédition"
              value={`${stats.kpis.shippedRatePct}%`}
            />
            <MiniMetric
              label="Skins / commande"
              value={String(stats.kpis.avgSkinsPerOrder)}
            />
            <MiniMetric
              label="En production"
              value={String(stats.kpis.inProduction)}
            />
            <MiniMetric
              label="File d'attente"
              value={String(stats.kpis.pendingQueue)}
            />
          </div>
          {stats.shippingMethods.length > 0 && (
            <div className="mt-5">
              <p className="text-[10px] font-medium uppercase tracking-widest text-drip-muted">
                Modes d&apos;expédition
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {stats.shippingMethods.map((s) => (
                  <li
                    key={s.method}
                    className="rounded-lg border border-drip-border bg-drip-elevated px-2.5 py-1 text-xs"
                  >
                    <span className="font-medium">{s.method}</span>
                    <span className="ml-1.5 font-mono text-drip-muted">
                      {s.count}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>
      </div>

      <div className="mt-8">
        <StatsTrendSection data={stats.dailySeries} />
      </div>

      <div className="mt-8">
        <PipelineStrip steps={pipelineSteps} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
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

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <article className="drip-card p-5 xl:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-xs font-medium tracking-widest text-drip-muted">
              Commandes récentes
            </h2>
            <Link href="/imposition" className="text-xs font-medium text-drip-volt">
              Imposition →
            </Link>
          </div>
          {stats.recentOrders.length === 0 ? (
            <p className="mt-4 text-sm text-drip-muted">Aucune commande.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-drip-border text-[10px] uppercase tracking-widest text-drip-muted">
                    <th className="pb-2 pr-3 font-medium">Client</th>
                    <th className="pb-2 pr-3 font-medium">Shopify</th>
                    <th className="pb-2 pr-3 font-medium">Skins</th>
                    <th className="pb-2 pr-3 font-medium">État</th>
                    <th className="pb-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.map((o) => (
                    <tr
                      key={o.id}
                      className="border-b border-drip-border/60 last:border-0"
                    >
                      <td className="py-2.5 pr-3 font-medium">
                        {o.customerName}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-xs text-drip-muted">
                        #{o.shopifyId}
                      </td>
                      <td className="py-2.5 pr-3 font-mono">{o.skinCount}</td>
                      <td className="py-2.5 pr-3">
                        <OrderProgress
                          shipped={o.shippedCount}
                          progress={o.inProgressCount}
                          scrap={o.scrapCount}
                          total={o.skinCount}
                        />
                      </td>
                      <td className="py-2.5 text-xs text-drip-muted">
                        {new Date(o.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="drip-card p-5">
          <h2 className="text-xs font-medium tracking-widest text-drip-muted">
            Derniers lots
          </h2>
          {stats.recentLots.length === 0 ? (
            <p className="mt-4 text-sm text-drip-muted">Aucun lot.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {stats.recentLots.map((lot) => (
                <li
                  key={lot.lotId}
                  className="flex items-center justify-between rounded-lg border border-drip-border bg-drip-elevated/80 px-3 py-2"
                >
                  <Link
                    href="/workshop"
                    className="font-mono text-sm font-semibold hover:text-drip-volt"
                  >
                    {lot.lotId}
                  </Link>
                  <span className="text-right text-xs text-drip-muted">
                    {lot.skinCount} skins · {lot.sheetCount} f.
                    <br />
                    {new Date(lot.createdAt).toLocaleDateString("fr-FR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-drip-muted">
            {stats.totals.lots} lots · {stats.totals.sheets} feuilles au total
          </p>
        </article>
      </div>

      <article className="drip-card mt-8 p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-xs font-medium tracking-widest text-drip-muted">
            Stock &amp; nomenclature
          </h2>
          <Link href="/inventory" className="text-xs font-medium text-drip-volt">
            Ouvrir le stock →
          </Link>
        </div>

        {stats.inventory.length === 0 ? (
          <p className="mt-4 text-sm text-drip-muted">
            Aucune ligne (migrations 004 + 006).
          </p>
        ) : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {stats.inventoryByCategory.map((cat) => (
                <div
                  key={cat.id}
                  className={`rounded-xl border px-3 py-3 ${
                    cat.alertCount > 0
                      ? "border-red-500/30 bg-red-500/10"
                      : "border-drip-border bg-drip-surface"
                  }`}
                >
                  <p className="text-xs font-medium">{cat.title}</p>
                  <p className="mt-1 font-mono text-lg font-semibold">
                    {cat.itemCount} art.
                    {cat.alertCount > 0 && (
                      <span className="ml-2 text-sm text-red-300">
                        {cat.alertCount} alerte
                        {cat.alertCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>

            {criticalStock.length > 0 && (
              <div className="mt-5">
                <p className="text-[10px] font-medium uppercase tracking-widest text-drip-muted">
                  Articles critiques
                </p>
                <ul className="mt-2 space-y-2">
                  {criticalStock.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{item.name}</span>
                      <span className="font-mono text-xs">
                        {item.current} {item.unit}
                        {item.daysUntilThreshold !== null && (
                          <span className="ml-2 text-red-200">
                            ~{item.daysUntilThreshold} j avant seuil
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </article>

      <div className="drip-card mt-8 flex flex-wrap gap-2 p-4 sm:gap-3">
        <QuickLink href="/imposition" label="Imposition" />
        <QuickLink href="/workshop" label="Atelier" />
        <QuickLink href="/scanner" label="Scanner" />
        <QuickLink href="/inventory" label="Stock" />
      </div>
    </DashboardShell>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-drip-border bg-drip-elevated/60 p-3">
      <p className="text-[10px] font-medium uppercase tracking-widest text-drip-muted">
        {label}
      </p>
      <p className="mt-1 font-mono text-xl font-semibold">{value}</p>
    </div>
  );
}

function OrderProgress({
  shipped,
  progress,
  scrap,
  total,
}: {
  shipped: number;
  progress: number;
  scrap: number;
  total: number;
}) {
  if (total === 0) return <span className="text-drip-muted">—</span>;
  const donePct = Math.round((shipped / total) * 100);
  return (
    <div className="min-w-[120px]">
      <div className="flex h-1.5 overflow-hidden rounded-full bg-drip-border">
        <div
          className="bg-drip-success"
          style={{ width: `${(shipped / total) * 100}%` }}
        />
        <div
          className="bg-drip-volt"
          style={{ width: `${(progress / total) * 100}%` }}
        />
        {scrap > 0 && (
          <div
            className="bg-red-500"
            style={{ width: `${(scrap / total) * 100}%` }}
          />
        )}
      </div>
      <p className="mt-1 text-[10px] text-drip-muted">
        {shipped}/{total} ship · {donePct}%
      </p>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="drip-touch rounded-lg border border-drip-border bg-drip-elevated px-3 py-2.5 text-[10px] font-medium transition hover:border-drip-volt/30 hover:bg-drip-volt/10 sm:px-4 sm:text-xs"
    >
      {label}
    </Link>
  );
}
