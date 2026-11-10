"use client";

import { X } from "lucide-react";
import {
  SCRAP_REASONS,
  type ScrapReasonValue,
} from "@/lib/workshop/scrap-reasons";

type Props = {
  open: boolean;
  designName: string;
  trackCode: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (reason: ScrapReasonValue) => void;
};

export function ScrapModal({
  open,
  designName,
  trackCode,
  loading,
  onClose,
  onConfirm,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scrap-modal-title"
    >
      <div className="drip-glass-nav w-full max-w-lg overflow-hidden rounded-2xl">
        <header className="flex items-start justify-between border-b border-drip-border px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-red-400">
              Rebut
            </p>
            <h2
              id="scrap-modal-title"
              className="font-display mt-1 text-xl font-medium"
            >
              Cause du rebut
            </h2>
            <p className="mt-1 font-mono text-xs text-drip-muted">{trackCode}</p>
            <p className="text-sm text-drip-ink/90">{designName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-drip-border bg-drip-elevated p-2 transition hover:bg-white/5"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </header>

        <div className="space-y-2 p-5">
          {SCRAP_REASONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              disabled={loading}
              onClick={() => onConfirm(value)}
              className="w-full rounded-xl border border-red-500/30 bg-red-500/15 py-4 text-base font-medium text-red-100 transition hover:bg-red-500/25 disabled:opacity-50"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
