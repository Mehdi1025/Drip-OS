"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CameraOff, RefreshCw } from "lucide-react";
import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
} from "html5-qrcode";
import { humanizeCameraError } from "@/lib/scanner/camera-error-message";

type Props = {
  paused?: boolean;
  onScan: (decodedText: string) => void;
  onCameraBlocked?: (copy: ReturnType<typeof humanizeCameraError>) => void;
  onCameraReady?: () => void;
};

const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
];

const SCANNER_CONFIG = {
  fps: 10,
  formatsToSupport: SUPPORTED_FORMATS,
  qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
    const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
    const size = Math.floor(minEdge * 0.75);
    return { width: size, height: Math.floor(size * 0.45) };
  },
};

type CameraPhase = "starting" | "running" | "blocked";

async function safeStopScanner(instance: Html5Qrcode): Promise<void> {
  try {
    await instance.stop();
  } catch {
    /* déjà arrêté ou jamais démarré */
  }
  try {
    await instance.clear();
  } catch {
    /* DOM déjà nettoyé */
  }
}

export function BarcodeScanner({
  paused,
  onScan,
  onCameraBlocked,
  onCameraReady,
}: Props) {
  const reactId = useId();
  const regionId = `barcode-scanner-${reactId.replace(/:/g, "")}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const onBlockedRef = useRef(onCameraBlocked);
  onBlockedRef.current = onCameraBlocked;
  const onReadyRef = useRef(onCameraReady);
  onReadyRef.current = onCameraReady;

  const [phase, setPhase] = useState<CameraPhase>("starting");
  const [blockedCopy, setBlockedCopy] = useState<
    ReturnType<typeof humanizeCameraError> | null
  >(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setBlockedCopy(null);
    setPhase("starting");
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let html5QrCode: Html5Qrcode | null = null;

    const startScanner = async () => {
      try {
        html5QrCode = new Html5Qrcode(regionId, { verbose: false });
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          SCANNER_CONFIG,
          (decodedText) => {
            if (cancelled || pausedRef.current) return;
            onScanRef.current(decodedText);
          },
          () => {
            /* frame sans code — normal */
          }
        );

        if (cancelled) {
          await safeStopScanner(html5QrCode);
          return;
        }

        setPhase("running");
        setBlockedCopy(null);
        onReadyRef.current?.();
      } catch (err) {
        if (cancelled) return;
        const copy = humanizeCameraError(err);
        setBlockedCopy(copy);
        setPhase("blocked");
        onBlockedRef.current?.(copy);
        if (html5QrCode) {
          await safeStopScanner(html5QrCode);
          scannerRef.current = null;
        }
      }
    };

    void startScanner();

    return () => {
      cancelled = true;
      const instance = scannerRef.current;
      scannerRef.current = null;
      if (instance) {
        void safeStopScanner(instance);
      }
    };
  }, [regionId, attempt]);

  if (phase === "blocked" && blockedCopy) {
    return (
      <div
        className="border-4 border-drip-ink bg-drip-surface shadow-brutal"
        data-testid="barcode-scanner-blocked"
      >
        <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 border-b-4 border-drip-ink bg-drip-ink px-4 py-8 text-center text-drip-paper">
          <CameraOff className="h-12 w-12" strokeWidth={2} aria-hidden />
          <p className="text-sm font-black uppercase tracking-wide">
            {blockedCopy.title}
          </p>
          <p className="max-w-sm text-xs font-medium leading-snug text-drip-paper/80">
            {blockedCopy.detail}
          </p>
        </div>
        <button
          type="button"
          onClick={retry}
          className="drip-touch flex w-full items-center justify-center gap-2 bg-drip-volt py-4 text-sm font-black uppercase text-drip-ink"
        >
          <RefreshCw className="h-5 w-5" strokeWidth={2.5} />
          Réactiver la caméra
        </button>
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden border-4 border-[#0a0a0a] bg-black shadow-[6px_6px_0_0_#0a0a0a]"
      data-testid="barcode-scanner-region"
    >
      {phase === "starting" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0a0a0a] text-sm font-bold uppercase text-white">
          Initialisation caméra…
        </div>
      )}
      <div id={regionId} className="min-h-[220px] w-full [& video]:object-cover" />
      {paused && phase === "running" && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]/60 text-sm font-bold uppercase text-white">
          Scan en pause
        </div>
      )}
    </div>
  );
}
