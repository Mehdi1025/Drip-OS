"use client";

import { useEffect, useId, useRef } from "react";
import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
} from "html5-qrcode";

type Props = {
  paused?: boolean;
  onScan: (decodedText: string) => void;
  onError?: (message: string) => void;
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

export function BarcodeScanner({ paused, onScan, onError }: Props) {
  const reactId = useId();
  const regionId = `barcode-scanner-${reactId.replace(/:/g, "")}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (paused) return;

    let cancelled = false;
    const html5QrCode = new Html5Qrcode(regionId, { verbose: false });
    scannerRef.current = html5QrCode;

    const startScanner = async () => {
      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          SCANNER_CONFIG,
          (decodedText) => {
            if (!cancelled) onScanRef.current(decodedText);
          },
          () => {
            /* scan attempt — ignore */
          }
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Impossible d'accéder à la caméra.";
        onError?.(message);
      }
    };

    void startScanner();

    return () => {
      cancelled = true;
      const instance = scannerRef.current;
      scannerRef.current = null;
      if (!instance) return;
      void instance
        .stop()
        .then(() => instance.clear())
        .catch(() => {
          /* déjà arrêté */
        });
    };
  }, [paused, regionId, onError]);

  return (
    <div
      className="relative overflow-hidden border-4 border-[#0a0a0a] bg-black shadow-[6px_6px_0_0_#0a0a0a]"
      data-testid="barcode-scanner-region"
    >
      <div id={regionId} className="min-h-[220px] w-full [& video]:object-cover" />
      {paused && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]/60 text-sm font-bold uppercase text-white">
          Scan en pause
        </div>
      )}
    </div>
  );
}
