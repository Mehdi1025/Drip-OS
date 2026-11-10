"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";
import { ScanLine, Search } from "lucide-react";
import {
  fetchLotWorkshop,
  markSkinCut,
  markSkinScrap,
} from "@/app/workshop/actions";
import { ScrapModal } from "@/components/workshop/ScrapModal";
import { WorkshopSheetSection } from "@/components/workshop/WorkshopSheetSection";
import { isValidLotId, normalizeLotId } from "@/lib/workshop/lot-pattern";
import type { ScrapReasonValue } from "@/lib/workshop/scrap-reasons";
import type { RecentWorkshopLot, WorkshopLotData } from "@/lib/workshop/types";

type Props = {
  initialRecentLots?: RecentWorkshopLot[];
};

export function WorkshopDashboard({ initialRecentLots = [] }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [lotInput, setLotInput] = useState("");
  const [lotData, setLotData] = useState<WorkshopLotData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busySkinId, setBusySkinId] = useState<string | null>(null);
  const [scrapTarget, setScrapTarget] = useState<{
    id: string;
    design_name: string;
    track_code: string;
  } | null>(null);
  const [isFetching, startFetch] = useTransition();
  const [isActing, startAction] = useTransition();

  const loadLot = useCallback((value: string) => {
    const normalized = normalizeLotId(value);
    setLotInput(normalized);
    setError(null);

    if (!isValidLotId(normalized)) {
      setError("Format invalide. Exemple : L-261013-01");
      setLotData(null);
      return;
    }

    startFetch(async () => {
      const result = await fetchLotWorkshop(normalized);
      if (!result.ok) {
        setError(result.error);
        setLotData(null);
        return;
      }
      setLotData(result.data);
    });
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadLot(lotInput);
  }

  function removeSkinFromView(skinId: string) {
    setLotData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sheets: prev.sheets.map((sheet) => ({
          ...sheet,
          slots: sheet.slots.map((s) => (s?.id === skinId ? null : s)),
        })),
      };
    });
  }

  function handleOk(skinId: string) {
    setBusySkinId(skinId);
    startAction(async () => {
      const result = await markSkinCut(skinId);
      setBusySkinId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      removeSkinFromView(skinId);
      router.refresh();
    });
  }

  function handleScrapConfirm(reason: ScrapReasonValue) {
    if (!scrapTarget) return;
    const targetId = scrapTarget.id;
    setBusySkinId(targetId);
    startAction(async () => {
      const result = await markSkinScrap(targetId, reason);
      setBusySkinId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setScrapTarget(null);
      removeSkinFromView(targetId);
      router.refresh();
    });
  }

  const totalSkins =
    lotData?.sheets.reduce(
      (acc, sheet) => acc + sheet.slots.filter(Boolean).length,
      0
    ) ?? 0;

  return (
    <div className="drip-page">
      <header className="drip-header">
        <p className="drip-kicker">Atelier · Tablette</p>
        <h1 className="drip-title">Contrôle découpe</h1>

        <form
          onSubmit={handleSubmit}
          className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-stretch"
        >
          <label className="drip-card flex flex-1 items-center gap-3 rounded-xl px-4">
            <ScanLine className="h-7 w-7 shrink-0" strokeWidth={2.5} />
            <input
              ref={inputRef}
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="L-261013-01"
              value={lotInput}
              onChange={(e) => setLotInput(e.target.value.toUpperCase())}
              onBlur={() => {
                if (lotInput.trim()) loadLot(lotInput);
              }}
              className="min-h-[56px] w-full min-w-0 bg-transparent font-mono text-base outline-none placeholder:text-drip-muted sm:text-lg"
            />
          </label>
          <button
            type="submit"
            disabled={isFetching}
            className="drip-btn-volt flex min-h-[56px] items-center justify-center gap-2 px-8 text-lg disabled:opacity-50"
          >
            <Search className="h-6 w-6" strokeWidth={3} />
            {isFetching ? "Chargement…" : "Charger"}
          </button>
        </form>

        {error && (
          <p className="drip-flash-err mt-4">
            {error}
          </p>
        )}

        {initialRecentLots.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-medium uppercase tracking-widest text-drip-muted">
              Derniers lots
            </p>
            <ul className="drip-scroll-x mt-2 sm:flex-wrap">
              {initialRecentLots.map((lot) => {
                const active = lotData?.lotId === lot.lotId;
                const label =
                  lot.pendingControl > 0
                    ? `${lot.lotId} · ${lot.pendingControl} à contrôler`
                    : `${lot.lotId} · terminé`;
                return (
                  <li key={lot.lotId}>
                    <button
                      type="button"
                      disabled={isFetching}
                      onClick={() => loadLot(lot.lotId)}
                      className={`drip-touch rounded-lg border px-3 py-2 font-mono text-xs transition sm:text-sm ${
                        active
                          ? "border-drip-volt/40 bg-drip-volt/15 text-drip-volt"
                          : "border-drip-border bg-drip-surface hover:border-drip-border-strong"
                      }`}
                    >
                      {label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {lotData && (
          <p className="mt-4 font-mono text-sm font-bold">
            Lot <span className="text-lg">{lotData.lotId}</span> — {totalSkins}{" "}
            skin(s) à contrôler
          </p>
        )}
      </header>

      <main className="space-y-8 px-4 py-6 sm:space-y-10 sm:px-8 sm:py-8">
        {!lotData && !error && (
          <div className="drip-empty">
            <p className="font-display text-lg font-medium">
              Scanne un numéro de lot pour commencer
            </p>
          </div>
        )}

        {lotData?.sheets.length === 0 && (
          <div className="drip-card p-8 text-center">
            <p className="font-medium">Aucune feuille active sur ce lot</p>
          </div>
        )}

        {lotData?.sheets.map((sheet) => (
          <WorkshopSheetSection
            key={sheet.id}
            sheet={sheet}
            busySkinId={busySkinId}
            onOk={handleOk}
            onScrap={setScrapTarget}
          />
        ))}
      </main>

      <ScrapModal
        open={scrapTarget !== null}
        designName={scrapTarget?.design_name ?? ""}
        trackCode={scrapTarget?.track_code ?? ""}
        loading={isActing}
        onClose={() => !isActing && setScrapTarget(null)}
        onConfirm={handleScrapConfirm}
      />
    </div>
  );
}
