"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { PackageCheck, Keyboard } from "lucide-react";
import {
  fetchSkinByTrackCode,
  markSkinShipped,
} from "@/app/scanner/actions";
import type { ScannedSkinPayload } from "@/lib/scanner/types";
import { normalizeTrackCode } from "@/lib/scanner/track-code";

const BarcodeScanner = dynamic(
  () =>
    import("@/components/scanner/BarcodeScanner").then((m) => m.BarcodeScanner),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[220px] items-center justify-center border-4 border-[#0a0a0a] bg-[#0a0a0a] text-sm font-bold uppercase text-white">
        Initialisation caméra…
      </div>
    ),
  }
);

const SCAN_COOLDOWN_MS = 1500;
const FLASH_MS = 700;

export function ScannerView() {
  const [skin, setSkin] = useState<ScannedSkinPayload | null>(null);
  const [displayLabel, setDisplayLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [cameraPaused, setCameraPaused] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [isFetching, startFetch] = useTransition();
  const [isShipping, startShip] = useTransition();
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);

  const resolveCode = useCallback((raw: string) => {
    const code = normalizeTrackCode(raw);
    if (!code) return;

    const now = Date.now();
    const last = lastScanRef.current;
    if (last && last.code === code && now - last.at < SCAN_COOLDOWN_MS) {
      return;
    }
    lastScanRef.current = { code, at: now };

    setError(null);
    startFetch(async () => {
      const result = await fetchSkinByTrackCode(code);
      if (!result.ok) {
        setError(result.error);
        setSkin(null);
        setDisplayLabel(null);
        return;
      }

      setSkin(result.skin);
      setDisplayLabel(result.displayLabel);
      setFlash(true);
      setCameraPaused(true);
    });
  }, []);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(false), FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [flash]);

  function handleShipped() {
    if (!skin) return;
    setError(null);
    startShip(async () => {
      const result = await markSkinShipped(skin.skinId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSkin(null);
      setDisplayLabel(null);
      setCameraPaused(false);
      lastScanRef.current = null;
    });
  }

  const canShip = skin?.status === "cut" && !isShipping;

  return (
    <div
      className="relative mx-auto flex min-h-[100dvh] max-w-lg flex-col bg-drip-paper text-drip-ink"
      data-testid="scanner-view"
    >
      {flash && (
        <div
          className="pointer-events-none fixed inset-0 z-50 animate-pulse bg-[#22c55e]/85"
          data-testid="scan-success-flash"
          aria-hidden
        />
      )}

      <header className="border-b-4 border-drip-ink bg-drip-surface px-4 py-4 shadow-brutal-volt">
        <p className="drip-kicker text-drip-ink/70">Emballage</p>
        <h1 className="text-2xl font-black uppercase">Scanner</h1>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-36">
        <BarcodeScanner
          paused={cameraPaused || isFetching}
          onScan={resolveCode}
          onError={(message) => setError(message)}
        />

        <button
          type="button"
          onClick={() => setManualOpen((v) => !v)}
          className="flex w-full items-center justify-center gap-2 border-2 border-drip-ink/20 py-2 text-xs font-bold uppercase text-drip-ink/60"
          data-testid="toggle-manual-entry"
        >
          <Keyboard className="h-4 w-4" />
          {manualOpen ? "Masquer saisie test" : "Saisie manuelle (test)"}
        </button>

        {manualOpen && (
          <form
            className="flex gap-2"
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
              className="min-h-[48px] flex-1 border-4 border-drip-ink bg-drip-surface px-3 font-mono text-sm outline-none"
              data-testid="manual-track-input"
            />
            <button
              type="submit"
              className="drip-btn-volt border-4 px-4 py-2 shadow-brutal-sm"
            >
              OK
            </button>
          </form>
        )}

        {error && (
          <p
            className="border-4 border-red-500 bg-red-950 px-3 py-3 text-sm font-bold"
            data-testid="scanner-error"
          >
            {error}
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
              className="mt-3 text-3xl font-black leading-tight text-[#dcfce7] sm:text-4xl"
              data-testid="scan-display-label"
            >
              {displayLabel}
            </p>
            <p className="mt-4 font-mono text-xs text-[#86efac]">{skin.trackCode}</p>
            <p className="mt-1 text-sm font-bold uppercase text-[#bbf7d0]/80">
              {skin.customerName} · {skin.shippingMethod}
            </p>
            {skin.status !== "cut" && (
              <p className="mt-3 text-sm font-bold text-amber-300">
                Statut actuel : {skin.status} — expédition bloquée tant que le
                contrôle atelier n&apos;est pas OK.
              </p>
            )}
          </section>
        )}

        {!displayLabel && !error && (
          <p className="text-center text-sm font-medium text-drip-ink/45">
            Vise le code-barres ou QR du track code sur l&apos;étiquette.
          </p>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t-4 border-drip-ink bg-drip-paper pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-lg px-4 pt-4">
        <button
          type="button"
          disabled={!canShip}
          onClick={handleShipped}
          className="drip-btn-volt flex w-full min-h-[64px] items-center justify-center gap-3 text-lg shadow-brutal disabled:opacity-40"
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
