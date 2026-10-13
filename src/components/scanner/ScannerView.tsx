"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Keyboard, PackageCheck } from "lucide-react";
import {
  fetchSkinByTrackCode,
  markSkinShipped,
} from "@/app/scanner/actions";
import type { CameraErrorCopy } from "@/lib/scanner/camera-error-message";
import type { ScannedSkinPayload } from "@/lib/scanner/types";
import { normalizeTrackCode } from "@/lib/scanner/track-code";

const BarcodeScanner = dynamic(
  () =>
    import("@/components/scanner/BarcodeScanner").then((m) => m.BarcodeScanner),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[220px] items-center justify-center border-4 border-drip-ink bg-drip-ink text-sm font-bold uppercase text-drip-paper">
        Chargement du scanner…
      </div>
    ),
  }
);

const SCAN_COOLDOWN_MS = 1500;
const FLASH_MS = 700;

export function ScannerView() {
  const [skin, setSkin] = useState<ScannedSkinPayload | null>(null);
  const [displayLabel, setDisplayLabel] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [cameraNotice, setCameraNotice] = useState<CameraErrorCopy | null>(
    null
  );
  const [flash, setFlash] = useState(false);
  const [cameraPaused, setCameraPaused] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [isFetching, startFetch] = useTransition();
  const [isShipping, startShip] = useTransition();
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);

  const handleCameraBlocked = useCallback((copy: CameraErrorCopy) => {
    setCameraNotice(copy);
    setManualOpen(true);
  }, []);

  const handleCameraReady = useCallback(() => {
    setCameraNotice(null);
  }, []);

  const resolveCode = useCallback((raw: string) => {
    const code = normalizeTrackCode(raw);
    if (!code) return;

    const now = Date.now();
    const last = lastScanRef.current;
    if (last && last.code === code && now - last.at < SCAN_COOLDOWN_MS) {
      return;
    }
    lastScanRef.current = { code, at: now };

    setApiError(null);
    startFetch(async () => {
      try {
        const result = await fetchSkinByTrackCode(code);
        if (!result.ok) {
          setApiError(result.error);
          setSkin(null);
          setDisplayLabel(null);
          return;
        }

        setSkin(result.skin);
        setDisplayLabel(result.displayLabel);
        setFlash(true);
        setCameraPaused(true);
      } catch {
        setApiError("Erreur réseau lors de la lecture du code.");
      }
    });
  }, []);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(false), FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [flash]);

  function handleShipped() {
    if (!skin) return;
    setApiError(null);
    const skinId = skin.skinId;
    startShip(async () => {
      try {
        const result = await markSkinShipped(skinId);
        if (!result.ok) {
          setApiError(result.error);
          return;
        }
        setSkin(null);
        setDisplayLabel(null);
        setCameraPaused(false);
        lastScanRef.current = null;
      } catch {
        setApiError("Impossible de contacter le serveur. Réessaie.");
      }
    });
  }

  const shippableStatuses = ["imposed", "printed", "cut"] as const;
  const canShip =
    skin != null &&
    shippableStatuses.includes(
      skin.status as (typeof shippableStatuses)[number]
    ) &&
    !isShipping;

  const showHint =
    !displayLabel && !apiError && !cameraNotice && !manualOpen;

  return (
    <div
      className="relative flex min-h-[100dvh] w-full max-w-none flex-col bg-drip-paper text-drip-ink md:mx-auto md:max-w-lg"
      data-testid="scanner-view"
    >
      {flash && (
        <div
          className="pointer-events-none fixed inset-0 z-50 animate-pulse bg-[#22c55e]/85"
          data-testid="scan-success-flash"
          aria-hidden
        />
      )}

      <header className="hidden border-b-4 border-drip-ink bg-drip-surface px-4 py-4 shadow-brutal-volt md:block">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="drip-kicker text-drip-ink/70">Emballage</p>
            <h1 className="text-2xl font-black uppercase">Scanner</h1>
          </div>
          <Link
            href="/imposition"
            className="drip-touch inline-flex items-center gap-2 border-4 border-drip-ink bg-drip-volt px-4 py-2 text-xs font-black uppercase shadow-brutal-sm"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={3} />
            Bureau
          </Link>
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto overscroll-y-contain px-[calc(1rem+var(--drip-safe-left))] py-4 pr-[calc(1rem+var(--drip-safe-right))] pb-[calc(var(--drip-tab-bar-h)+var(--drip-scanner-dock-h)+var(--drip-safe-bottom)+0.5rem)] md:pb-[calc(var(--drip-scanner-dock-h)+var(--drip-safe-bottom)+0.5rem)]">
        <BarcodeScanner
          paused={cameraPaused || isFetching}
          onScan={resolveCode}
          onCameraBlocked={handleCameraBlocked}
          onCameraReady={handleCameraReady}
        />

        <button
          type="button"
          onClick={() => setManualOpen((v) => !v)}
          className="drip-touch flex w-full items-center justify-center gap-2 border-4 border-drip-ink bg-drip-surface py-3 text-xs font-bold uppercase"
          data-testid="toggle-manual-entry"
        >
          <Keyboard className="h-4 w-4" />
          {manualOpen
            ? "Masquer saisie manuelle"
            : cameraNotice
              ? "Saisie manuelle (recommandée)"
              : "Saisie manuelle"}
        </button>

        {(manualOpen || cameraNotice) && (
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              resolveCode(manualCode);
            }}
            data-testid="manual-track-form"
          >
            <input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="1042-F1-S1"
              autoComplete="off"
              className="min-h-[48px] flex-1 border-4 border-drip-ink bg-drip-surface px-3 font-mono text-sm outline-none"
              data-testid="manual-track-input"
            />
            <button
              type="submit"
              className="drip-btn-volt drip-touch border-4 px-6 py-3 shadow-brutal-sm sm:px-4 sm:py-2"
            >
              Valider
            </button>
          </form>
        )}

        {apiError && (
          <p
            className="border-4 border-red-600 bg-red-100 px-3 py-3 text-sm font-bold text-red-950"
            data-testid="scanner-error"
            role="alert"
          >
            {apiError}
          </p>
        )}

        {displayLabel && skin && (
          <section
            className="border-4 border-[#22c55e] bg-[#14532d] px-4 py-6 shadow-[8px_8px_0_0_#ccff00]"
            data-testid="scan-result"
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-[#bbf7d0]">
              Colis identifié
            </p>
            <p
              className="mt-3 break-words text-2xl font-black leading-tight text-[#dcfce7] sm:text-3xl md:text-4xl"
              data-testid="scan-display-label"
            >
              {displayLabel}
            </p>
            <p className="mt-4 font-mono text-xs text-[#86efac]">{skin.trackCode}</p>
            <p className="mt-1 text-sm font-bold uppercase text-[#bbf7d0]/80">
              {skin.customerName} · {skin.shippingMethod}
            </p>
            {!shippableStatuses.includes(
              skin.status as (typeof shippableStatuses)[number]
            ) && (
              <p className="mt-3 text-sm font-bold text-amber-300">
                Statut actuel : {skin.status} — génère un lot (Imposition) ou
                valide l&apos;atelier avant expédition.
              </p>
            )}
          </section>
        )}

        {showHint && (
          <p className="text-center text-sm font-medium text-drip-ink/45">
            Vise le code-barres ou QR du track code sur l&apos;étiquette.
          </p>
        )}
      </div>

      <div className="fixed bottom-[calc(var(--drip-tab-bar-h)+var(--drip-safe-bottom))] left-0 right-0 z-40 border-t-4 border-drip-ink bg-drip-paper pl-[var(--drip-safe-left)] pr-[var(--drip-safe-right)] md:bottom-[var(--drip-safe-bottom)]">
        <div className="mx-auto max-w-lg px-4 py-3">
          <button
            type="button"
            disabled={!canShip}
            onClick={handleShipped}
            className="drip-btn-volt drip-touch flex w-full min-h-[56px] items-center justify-center gap-3 text-base shadow-brutal disabled:opacity-40 sm:min-h-[64px] sm:text-lg"
            data-testid="mark-shipped-cta"
          >
            <PackageCheck className="h-8 w-8" strokeWidth={3} />
            {isShipping ? "Envoi…" : "Marquer Expédié"}
          </button>
        </div>
      </div>
    </div>
  );
}
