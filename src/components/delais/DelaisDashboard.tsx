"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  createClaim,
  lookupOrderForClaim,
  updateClaimStatus,
} from "@/app/delais/actions";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { StatBadge } from "@/components/layout/StatBadge";
import { BLOCKAGE_LABELS } from "@/lib/delais/at-risk";
import {
  customerShortName,
  formatDays,
  formatHours,
  formatPercent,
  shopifyAdminOrderUrl,
} from "@/lib/delais/format";
import { PROMISE_HOURS, STALE_TRACKING_BUSINESS_DAYS } from "@/lib/delais/config";
import type {
  BlockageReason,
  DelaisDashboardPayload,
  DelaisPeriodDays,
} from "@/lib/delais/types";

type Props = {
  initial: DelaisDashboardPayload;
};

const REASON_CHIP: Record<BlockageReason, string> = {
  visuel_a_valider: "bg-drip-peach/25 text-drip-ink",
  stock_manquant: "bg-red-500/15 text-red-900",
  rebut_a_refaire: "bg-amber-500/20 text-amber-950",
  pas_encore_impose: "bg-drip-volt/20 text-drip-ink",
  planche_manquante: "bg-drip-lilac/50 text-drip-ink",
  alerte: "bg-red-600/20 text-red-950",
};

function slaTone(pct: number | null): "default" | "danger" | "success" {
  if (pct == null) return "default";
  if (pct >= 95) return "success";
  if (pct >= 85) return "default";
  return "danger";
}

function photoMailTo(trackCode: string, idShopify: number): string {
  const subject = encodeURIComponent(`Photo pour commande #${idShopify}`);
  const body = encodeURIComponent(
    `Bonjour,\n\nNous avons besoin d'une nouvelle photo pour finaliser votre DripMyCard (réf. ${trackCode}).\n\nMerci,\nL'équipe DripMyCard`
  );
  return `mailto:?subject=${subject}&body=${body}`;
}

export function DelaisDashboard({ initial }: Props) {
  const router = useRouter();
  const [period, setPeriod] = useState<DelaisPeriodDays>(initial.periodDays);
  const [data, setData] = useState(initial);
  const [filterReason, setFilterReason] = useState<BlockageReason | "all">("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimQuery, setClaimQuery] = useState("");
  const [claimForm, setClaimForm] = useState<{
    orderId: string;
    idShopify: number;
    skins: { id: string; trackCode: string; designName: string }[];
    skinId?: string;
    type: "perdu" | "abime" | "retour" | "non_conforme" | "autre";
    note: string;
    resolution?: "reimpression" | "remboursement" | "renvoi" | "aucun";
    costEur?: number;
  } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const longestStage = useMemo(() => {
    if (!data.stageMedians.length) return null;
    return [...data.stageMedians].sort(
      (a, b) => b.medianHours - a.medianHours
    )[0];
  }, [data.stageMedians]);

  const queue = useMemo(() => {
    return data.actionQueue.filter((row) => {
      if (overdueOnly && !row.overdue) return false;
      if (filterReason === "all") return true;
      return row.reasons.includes(filterReason);
    });
  }, [data.actionQueue, filterReason, overdueOnly]);

  function changePeriod(days: DelaisPeriodDays) {
    setPeriod(days);
    start(async () => {
      const { fetchDelaisDashboard } = await import("@/app/delais/actions");
      const next = await fetchDelaisDashboard(days);
      setData(next);
    });
  }

  return (
    <DashboardShell
      kicker="Pilotage · Service client"
      title="Délais & service client"
      stats={
        <>
          <StatBadge
            label="Médiane expédition"
            value={formatHours(data.sla.medianHours)}
          />
          <StatBadge label="P90" value={formatHours(data.sla.p90Hours)} />
          <StatBadge
            label={`% < ${PROMISE_HOURS} h`}
            value={formatPercent(data.sla.pctUnder48)}
            variant={slaTone(data.sla.pctUnder48)}
          />
          <StatBadge
            label="En retard"
            value={data.overdueCount}
            variant={data.overdueCount > 0 ? "danger" : "default"}
          />
          <StatBadge label="À risque" value={data.atRiskCount} variant="volt" />
          <StatBadge
            label="Taux litiges"
            value={formatPercent(data.globalClaimRatePct)}
          />
        </>
      }
    >
      <div className="mb-8 flex flex-wrap gap-2">
        {([7, 30, 90] as DelaisPeriodDays[]).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => changePeriod(d)}
            className={`rounded-xl border px-4 py-2 text-xs font-semibold ${
              period === d
                ? "border-drip-volt bg-drip-volt/15 text-drip-ink"
                : "border-drip-border bg-drip-card text-drip-muted"
            }`}
          >
            {d} j
          </button>
        ))}
      </div>

      {msg && (
        <p className="mb-4 rounded-xl border border-drip-border bg-drip-elevated px-4 py-3 text-sm">
          {msg}
        </p>
      )}

      {/* Bloc 1 — Promesse */}
      <section className="mb-10 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-drip-muted">
          Promesse {PROMISE_HOURS} h
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Médiane" value={formatHours(data.sla.medianHours)} />
          <KpiCard label="P90" value={formatHours(data.sla.p90Hours)} />
          <KpiCard
            label="Moyenne"
            value={formatHours(data.sla.meanHours)}
          />
          <KpiCard
            label={`% sous ${PROMISE_HOURS} h`}
            value={formatPercent(data.sla.pctUnder48)}
            highlight={
              data.sla.pctUnder48 != null && data.sla.pctUnder48 < 85
                ? "peach"
                : "volt"
            }
          />
        </div>

        <article className="drip-card p-5">
          <h3 className="text-xs font-medium text-drip-muted">
            Évolution hebdomadaire (médiane / P90)
          </h3>
          {data.weeklySla.length === 0 ? (
            <p className="mt-3 text-sm text-drip-muted">
              Pas encore assez de commandes expédiées sur la période.
            </p>
          ) : (
            <div className="mt-4 flex items-end gap-2 overflow-x-auto pb-2">
              {data.weeklySla.map((w) => (
                <div key={w.weekStart} className="flex min-w-[52px] flex-col items-center">
                  <div className="relative flex h-28 w-10 flex-col justify-end gap-0.5">
                    <div
                      className="w-full rounded-t bg-drip-volt"
                      style={{
                        height: `${Math.min(((w.medianHours ?? 0) / PROMISE_HOURS) * 70, 100)}%`,
                      }}
                      title={`Médiane ${formatHours(w.medianHours)}`}
                    />
                    <div
                      className="absolute bottom-0 left-0 right-0 border-t-2 border-dashed border-drip-peach"
                      style={{ bottom: "66%" }}
                      title={`Objectif ${PROMISE_HOURS} h`}
                    />
                  </div>
                  <span className="mt-1 text-[9px] font-bold">{w.weekLabel}</span>
                  <span className="text-[8px] text-drip-muted">
                    P90 {formatHours(w.p90Hours)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </article>

        <div className="grid gap-4 lg:grid-cols-2">
          <article className="drip-card p-5">
            <h3 className="text-xs font-medium text-drip-muted">
              Temps médian par étape
            </h3>
            {data.stageMedians.length === 0 ? (
              <p className="mt-3 text-sm text-drip-muted">
                Historique de statuts en cours de constitution.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {data.stageMedians.map((s) => (
                  <li key={s.status}>
                    <div className="flex justify-between text-xs">
                      <span
                        className={
                          longestStage?.status === s.status
                            ? "font-bold text-drip-peach"
                            : ""
                        }
                      >
                        {s.label}
                        {longestStage?.status === s.status ? " · goulot" : ""}
                      </span>
                      <span className="font-mono">{formatHours(s.medianHours)}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-drip-elevated">
                      <div
                        className="h-2 rounded-full bg-drip-violet"
                        style={{
                          width: `${Math.min(
                            (s.medianHours / (longestStage?.medianHours || 1)) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="drip-card p-5">
            <h3 className="text-xs font-medium text-drip-muted">
              Perso vs catalogue
            </h3>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt>Skins perso (visuel)</dt>
                <dd className="font-mono">{formatHours(data.persoMedianHours)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Catalogue</dt>
                <dd className="font-mono">
                  {formatHours(data.catalogMedianHours)}
                </dd>
              </div>
            </dl>
          </article>
        </div>
      </section>

      {/* Bloc 2 — À traiter */}
      <section className="mb-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-drip-muted">
            À traiter maintenant
          </h2>
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => setOverdueOnly(e.target.checked)}
              />
              En retard uniquement
            </label>
            <select
              className="rounded-lg border border-drip-border bg-drip-elevated px-2 py-1 text-xs"
              value={filterReason}
              onChange={(e) =>
                setFilterReason(e.target.value as BlockageReason | "all")
              }
            >
              <option value="all">Toutes raisons</option>
              {(Object.keys(BLOCKAGE_LABELS) as BlockageReason[]).map((r) => (
                <option key={r} value={r}>
                  {BLOCKAGE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {queue.length === 0 ? (
          <p className="drip-card px-4 py-8 text-center text-sm text-drip-muted">
            Aucune commande en retard ou à risque pour ces filtres.
          </p>
        ) : (
          <div className="space-y-3">
            {queue.map((row) => {
              const shopUrl = shopifyAdminOrderUrl(row.idShopify);
              const timeLabel = row.overdue
                ? `Retard ${formatHours(Math.abs(row.hoursToDue))}`
                : `Reste ${formatHours(row.hoursToDue)}`;
              return (
                <article
                  key={row.orderId}
                  className="drip-card border-l-4 border-l-drip-peach p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-semibold text-drip-volt">
                        {shopUrl ? (
                          <a href={shopUrl} target="_blank" rel="noreferrer">
                            #{row.idShopify}
                          </a>
                        ) : (
                          <>#{row.idShopify}</>
                        )}
                      </p>
                      <p className="text-sm font-medium">
                        {customerShortName(row.customerName)}
                      </p>
                      <p className="text-xs text-drip-muted">
                        {row.country ?? "—"} · {row.shippingMethod}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-bold ${
                        row.overdue ? "text-red-700" : "text-drip-peach"
                      }`}
                    >
                      {timeLabel}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {row.skins.map((s) => (
                      <span
                        key={s.id}
                        className="rounded-full border border-drip-border px-2 py-0.5 font-mono text-[10px]"
                        title={s.designName}
                      >
                        {s.trackCode} · {s.status}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {row.reasons.map((r) => (
                      <span
                        key={r}
                        className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase ${REASON_CHIP[r]}`}
                      >
                        {BLOCKAGE_LABELS[r]}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    {row.reasons.includes("planche_manquante") && row.lotId && (
                      <Link
                        href={`/lots/${row.lotId}`}
                        className="rounded-lg border border-drip-border px-3 py-1.5 font-medium underline"
                      >
                        Lot {row.lotId}
                      </Link>
                    )}
                    {row.reasons.includes("stock_manquant") && (
                      <Link
                        href="/inventory"
                        className="rounded-lg border border-drip-border px-3 py-1.5 font-medium underline"
                      >
                        Stock
                      </Link>
                    )}
                    {row.reasons.includes("rebut_a_refaire") && (
                      <Link
                        href="/workshop"
                        className="rounded-lg border border-drip-border px-3 py-1.5 font-medium underline"
                      >
                        Atelier
                      </Link>
                    )}
                    {row.reasons.includes("visuel_a_valider") &&
                      row.skins[0] && (
                        <a
                          href={photoMailTo(
                            row.skins[0].trackCode,
                            row.idShopify
                          )}
                          className="rounded-lg bg-drip-peach/20 px-3 py-1.5 font-medium"
                        >
                          Demander une autre photo
                        </a>
                      )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Bloc 3 — Transporteurs */}
      <section className="mb-10">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-drip-muted">
          Transporteurs × pays
        </h2>
        {data.carrierMatrix.length === 0 ? (
          <p className="drip-card px-4 py-6 text-sm text-drip-muted">
            Pas encore de livraisons suivies sur la période.
          </p>
        ) : (
          <div className="overflow-x-auto drip-card">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="border-b border-drip-border text-drip-muted">
                <tr>
                  <th className="px-3 py-2">Transporteur</th>
                  <th className="px-3 py-2">Pays</th>
                  <th className="px-3 py-2">Colis</th>
                  <th className="px-3 py-2">Médiane</th>
                  <th className="px-3 py-2">P90</th>
                  <th className="px-3 py-2">≤ 3 j</th>
                  <th className="px-3 py-2">Suivi inconnu</th>
                </tr>
              </thead>
              <tbody>
                {data.carrierMatrix.map((c) => (
                  <tr key={`${c.carrier}-${c.country}`} className="border-b border-drip-border/60">
                    <td className="px-3 py-2 font-medium">
                      {c.carrier}
                      {c.recommended && (
                        <span className="ml-2 rounded bg-drip-volt/25 px-1.5 py-0.5 text-[9px] font-bold uppercase">
                          Recommandé
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">{c.country}</td>
                    <td className="px-3 py-2 font-mono">{c.count}</td>
                    <td className="px-3 py-2 font-mono">{formatDays(c.medianDays)}</td>
                    <td className="px-3 py-2 font-mono">{formatDays(c.p90Days)}</td>
                    <td className="px-3 py-2 font-mono">
                      {formatPercent(c.pctUnder3Days)}
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {formatPercent(c.pctUnknown)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data.staleTracking.length > 0 && (
          <ul className="mt-4 space-y-2">
            <p className="text-xs font-medium text-drip-muted">
              Sans nouvelles depuis {STALE_TRACKING_BUSINESS_DAYS} j ouvrés
            </p>
            {data.staleTracking.map((s) => (
              <li
                key={s.orderId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-drip-border bg-drip-card px-3 py-2 text-xs"
              >
                <span className="font-mono">#{s.idShopify}</span>
                {s.trackingUrl ? (
                  <a
                    href={s.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    Suivi
                  </a>
                ) : (
                  <span className="text-drip-muted">{s.trackingNumber ?? "—"}</span>
                )}
                <button
                  type="button"
                  className="text-drip-peach underline"
                  onClick={() => {
                    setClaimOpen(true);
                    setClaimQuery(String(s.idShopify));
                  }}
                >
                  Ouvrir une réclamation
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Bloc 4 — Litiges */}
      <section className="mb-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-drip-muted">
            Litiges
          </h2>
          <button
            type="button"
            className="drip-btn-volt px-4 py-2 text-xs"
            onClick={() => setClaimOpen(true)}
          >
            Nouvelle réclamation
          </button>
        </div>

        {data.carrierClaims.length === 0 ? (
          <p className="text-sm text-drip-muted">Aucun litige enregistré.</p>
        ) : (
          <ul className="mb-6 space-y-2">
            {data.carrierClaims.map((c) => (
              <li key={c.carrier} className="drip-card px-4 py-3 text-xs">
                <div className="flex justify-between font-medium">
                  <span>{c.carrier}</span>
                  <span>{formatPercent(c.claimRatePct)} litiges</span>
                </div>
                <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-drip-elevated">
                  <div
                    className="bg-red-600"
                    style={{
                      width: `${(c.lost / Math.max(c.shipped, 1)) * 100}%`,
                    }}
                    title="Perdus"
                  />
                  <div
                    className="bg-drip-peach"
                    style={{
                      width: `${(c.damaged / Math.max(c.shipped, 1)) * 100}%`,
                    }}
                    title="Abîmés"
                  />
                  <div
                    className="bg-amber-500"
                    style={{
                      width: `${(c.returned / Math.max(c.shipped, 1)) * 100}%`,
                    }}
                    title="Retours"
                  />
                </div>
                <p className="mt-1 text-drip-muted">
                  {c.shipped} colis · coût {c.costEur.toFixed(0)} €
                </p>
              </li>
            ))}
          </ul>
        )}

        {data.openClaims.length === 0 ? (
          <p className="text-sm text-drip-muted">Aucune réclamation ouverte.</p>
        ) : (
          <ul className="space-y-2">
            {data.openClaims.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-drip-border px-3 py-2 text-xs"
              >
                <span>
                  #{c.idShopify} · {c.type} · {c.status}
                </span>
                <select
                  className="rounded border border-drip-border bg-drip-elevated px-2 py-1"
                  value={c.status}
                  onChange={(e) => {
                    start(async () => {
                      const res = await updateClaimStatus(
                        c.id,
                        e.target.value as "ouvert" | "en_cours" | "resolu"
                      );
                      if (res.ok) router.refresh();
                      else setMsg(res.error ?? "Erreur");
                    });
                  }}
                >
                  <option value="ouvert">Ouvert</option>
                  <option value="en_cours">En cours</option>
                  <option value="resolu">Résolu</option>
                </select>
              </li>
            ))}
          </ul>
        )}
      </section>

      {claimOpen && (
        <ClaimModal
          query={claimQuery}
          form={claimForm}
          pending={pending}
          onClose={() => {
            setClaimOpen(false);
            setClaimForm(null);
            setClaimQuery("");
          }}
          onQueryChange={setClaimQuery}
          onSearch={() => {
            start(async () => {
              const res = await lookupOrderForClaim(claimQuery);
              if (!res.ok) {
                setMsg(res.error);
                return;
              }
              setClaimForm({
                orderId: res.orderId,
                idShopify: res.idShopify,
                skins: res.skins,
                type: "perdu",
                note: "",
              });
            });
          }}
          onSubmit={() => {
            if (!claimForm) return;
            start(async () => {
              const res = await createClaim({
                orderId: claimForm.orderId,
                skinId: claimForm.skinId,
                type: claimForm.type,
                resolution: claimForm.resolution,
                costEur: claimForm.costEur,
                note: claimForm.note,
              });
              if (!res.ok) setMsg(res.error);
              else {
                setMsg("Réclamation créée.");
                setClaimOpen(false);
                setClaimForm(null);
                router.refresh();
              }
            });
          }}
          onFormChange={setClaimForm}
        />
      )}
    </DashboardShell>
  );
}

function KpiCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "volt" | "peach";
}) {
  return (
    <div className="drip-card p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-drip-muted">
        {label}
      </p>
      <p
        className={`mt-2 font-mono text-xl ${
          highlight === "peach" ? "text-drip-peach" : "text-drip-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ClaimModal({
  query,
  form,
  pending,
  onClose,
  onQueryChange,
  onSearch,
  onSubmit,
  onFormChange,
}: {
  query: string;
  form: {
    orderId: string;
    idShopify: number;
    skins: { id: string; trackCode: string; designName: string }[];
    skinId?: string;
    type: "perdu" | "abime" | "retour" | "non_conforme" | "autre";
    note: string;
    resolution?: "reimpression" | "remboursement" | "renvoi" | "aucun";
    costEur?: number;
  } | null;
  pending: boolean;
  onClose: () => void;
  onQueryChange: (v: string) => void;
  onSearch: () => void;
  onSubmit: () => void;
  onFormChange: (f: typeof form) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-drip-paper p-5 shadow-xl">
        <h3 className="font-display text-lg">Nouvelle réclamation</h3>
        <>
          <input
            className="mt-3 w-full rounded-xl border border-drip-border px-3 py-2 text-sm"
            placeholder="# commande ou track code"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
          <button
            type="button"
            className="mt-2 text-xs font-medium text-drip-violet underline"
            onClick={onSearch}
            disabled={pending}
          >
            Rechercher
          </button>
        </>

        {form && (
          <>
            <p className="mt-3 text-sm">
              Commande #{form.idShopify} · {form.skins.length} skin(s)
            </p>
            <select
              className="mt-2 w-full rounded-xl border border-drip-border px-3 py-2 text-sm"
              value={form.type}
              onChange={(e) =>
                onFormChange({
                  ...form,
                  type: e.target.value as typeof form.type,
                })
              }
            >
              <option value="perdu">Perdu</option>
              <option value="abime">Abîmé</option>
              <option value="retour">Retour</option>
              <option value="non_conforme">Non conforme</option>
              <option value="autre">Autre</option>
            </select>
            <select
              className="mt-2 w-full rounded-xl border border-drip-border px-3 py-2 text-sm"
              value={form.skinId ?? ""}
              onChange={(e) =>
                onFormChange({ ...form, skinId: e.target.value || undefined })
              }
            >
              <option value="">Skin (optionnel)</option>
              {form.skins.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.trackCode}
                </option>
              ))}
            </select>
            <select
              className="mt-2 w-full rounded-xl border border-drip-border px-3 py-2 text-sm"
              value={form.resolution ?? ""}
              onChange={(e) =>
                onFormChange({
                  ...form,
                  resolution:
                    (e.target.value as typeof form.resolution) || undefined,
                })
              }
            >
              <option value="">Résolution</option>
              <option value="reimpression">Réimpression</option>
              <option value="remboursement">Remboursement</option>
              <option value="renvoi">Renvoi</option>
              <option value="aucun">Aucune</option>
            </select>
            <textarea
              className="mt-2 w-full rounded-xl border border-drip-border px-3 py-2 text-sm"
              rows={3}
              placeholder="Note"
              value={form.note}
              onChange={(e) => onFormChange({ ...form, note: e.target.value })}
            />
            <button
              type="button"
              className="drip-btn-volt mt-4 w-full py-3 text-sm"
              disabled={pending}
              onClick={onSubmit}
            >
              Enregistrer
            </button>
          </>
        )}

        <button
          type="button"
          className="mt-4 w-full text-center text-xs text-drip-muted"
          onClick={onClose}
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
