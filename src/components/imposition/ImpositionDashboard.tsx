"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { chunkSkins } from "@/lib/imposition/group-skins";
import type { PendingSkin } from "@/lib/imposition/types";
import { GenerateLotButton } from "@/components/imposition/GenerateLotButton";
import { SheetPackCard } from "@/components/imposition/SheetPackCard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { StatBadge } from "@/components/layout/StatBadge";

type AwaitingProps = {
  rows: {
    lotId: string;
    missingSheets: number;
    totalSheets: number;
    ageHours: number;
  }[];
  totalMissing: number;
};

type Props = {
  initialSkins: PendingSkin[];
  awaitingFiles: AwaitingProps;
};

export function ImpositionDashboard({ initialSkins, awaitingFiles }: Props) {
  const router = useRouter();
  const [skins, setSkins] = useState(initialSkins);
  const [flash, setFlash] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  const packs = useMemo(() => chunkSkins(skins), [skins]);
  const sheetCount = packs.length;
  const emptySlots = sheetCount * 4 - skins.length;

  return (
    <DashboardShell
      kicker="Bureau · Imposition"
      title="File d'attente"
      stats={
        <>
          <StatBadge label="Skins pending" value={skins.length} variant="volt" />
          <StatBadge label="Feuilles A4" value={sheetCount} />
          <StatBadge
            label="Fichiers manquants"
            value={awaitingFiles.totalMissing}
            variant={awaitingFiles.totalMissing > 0 ? "danger" : "default"}
          />
        </>
      }
    >
      {awaitingFiles.rows.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-medium uppercase tracking-widest text-drip-muted">
            Lots en attente de fichier
          </h2>
          <ul className="mt-3 space-y-2">
            {awaitingFiles.rows.map((row) => (
              <li
                key={row.lotId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-drip-border bg-drip-card px-4 py-3"
              >
                <div>
                  <Link
                    href={`/lots/${row.lotId}`}
                    className="font-mono font-semibold text-drip-volt"
                  >
                    {row.lotId}
                  </Link>
                  <p className="text-xs text-drip-muted">
                    {row.missingSheets}/{row.totalSheets} feuille(s) sans PDF ·{" "}
                    {row.ageHours} h
                  </p>
                </div>
                <Link
                  href={`/lots/${row.lotId}`}
                  className="text-xs font-medium underline"
                >
                  Ouvrir le lot →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="flex flex-col-reverse gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
        <section className="min-w-0 max-w-full">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-medium text-drip-muted">
              Aperçu par paquets de 4
            </h2>
            <span className="drip-chip">4 slots / feuille</span>
          </div>

          {skins.length === 0 ? (
            <div className="drip-empty">
              <p className="font-display text-xl font-medium">Aucun skin pending</p>
              <p className="mt-2 text-sm text-drip-muted">
                Les commandes Shopify apparaîtront ici après synchronisation.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 pr-1 min-[480px]:grid-cols-2 xl:grid-cols-3 xl:gap-6 xl:pr-0">
              {packs.map((pack, index) => (
                <SheetPackCard
                  key={`pack-${index + 1}`}
                  sheetNumber={index + 1}
                  skins={pack}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start lg:order-none">
          {flash && (
            <div
              className={
                flash.type === "ok" ? "drip-flash-ok" : "drip-flash-err"
              }
            >
              {flash.text}
            </div>
          )}

          <div className="drip-card p-5">
            <p className="text-xs font-medium uppercase tracking-widest text-drip-muted">
              Action
            </p>
            <p className="mt-2 text-sm font-medium leading-snug">
              Crée un lot du jour, génère les feuilles, assigne les emplacements
              et passe les skins en{" "}
              <span className="font-black">imposed</span>.
            </p>

            <div className="mt-5">
              <GenerateLotButton
                pendingCount={skins.length}
                onSuccess={(result) => {
                  setSkins([]);
                  router.refresh();
                  let text = `Lot ${result.lotId} créé — ${result.sheets} feuille(s). Exporte le lot puis dépose les PDF sur /lots/${result.lotId}.`;
                  if (result.inventoryWarning) {
                    text += ` ⚠ Stock : ${result.inventoryWarning}`;
                  } else if (result.stockAlertsSent && result.stockAlertsSent > 0) {
                    text += ` 🚨 ${result.stockAlertsSent} alerte(s) restock envoyée(s).`;
                  }
                  setFlash({
                    type: result.inventoryWarning ? "err" : "ok",
                    text,
                  });
                }}
                onError={(message) => {
                  setFlash({ type: "err", text: message });
                }}
              />
            </div>
          </div>

          <ul className="drip-card space-y-2 p-4 text-xs text-drip-muted">
            <li>· Track code → N° cmd · F(n) · S(1-4)</li>
            <li>· Sheets → statut ready</li>
            <li>· Ordre FIFO (created_at)</li>
          </ul>
        </aside>
      </div>
    </DashboardShell>
  );
}
