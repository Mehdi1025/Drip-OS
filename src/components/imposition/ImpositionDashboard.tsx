"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { chunkSkins } from "@/lib/imposition/group-skins";
import type { PendingSkin } from "@/lib/imposition/types";
import { GenerateLotButton } from "@/components/imposition/GenerateLotButton";
import { SheetPackCard } from "@/components/imposition/SheetPackCard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { StatBadge } from "@/components/layout/StatBadge";

type Props = {
  initialSkins: PendingSkin[];
};

export function ImpositionDashboard({ initialSkins }: Props) {
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
          <StatBadge label="Emplacements vides" value={emptySlots} />
        </>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest">
              Aperçu par paquets de 4
            </h2>
            <span className="border-2 border-drip-ink bg-drip-volt px-2 py-0.5 font-mono text-xs font-bold">
              4 slots / feuille
            </span>
          </div>

          {skins.length === 0 ? (
            <div className="drip-empty">
              <p className="text-lg font-black uppercase">Aucun skin pending</p>
              <p className="mt-2 text-sm font-medium text-drip-ink/60">
                Les commandes Shopify apparaîtront ici après synchronisation.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
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

        <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          {flash && (
            <div
              className={`border-4 border-drip-ink px-4 py-3 text-sm font-bold shadow-brutal-sm ${
                flash.type === "ok" ? "bg-drip-volt" : "bg-drip-surface"
              }`}
            >
              {flash.text}
            </div>
          )}

          <div className="drip-card p-5">
            <p className="text-xs font-black uppercase tracking-widest text-drip-ink/50">
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
                  let text = `Lot ${result.lotId} créé — ${result.sheets} feuille(s).`;
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

          <ul className="space-y-2 border-4 border-drip-ink bg-drip-volt/25 p-4 text-xs font-bold uppercase tracking-wide text-drip-ink">
            <li>· Track code → N° cmd · F(n) · S(1-4)</li>
            <li>· Sheets → statut ready</li>
            <li>· Ordre FIFO (created_at)</li>
          </ul>
        </aside>
      </div>
    </DashboardShell>
  );
}
