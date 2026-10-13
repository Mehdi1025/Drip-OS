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
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#0a0a0a]/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scrap-modal-title"
    >
      <div className="w-full max-w-lg border-4 border-[#0a0a0a] bg-[#f2ede4] shadow-[10px_10px_0_0_#0a0a0a]">
        <header className="flex items-start justify-between border-b-4 border-[#0a0a0a] bg-white px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-red-600">
              Rebut
            </p>
            <h2 id="scrap-modal-title" className="mt-1 text-xl font-black uppercase">
              Cause du rebut
            </h2>
            <p className="mt-1 font-mono text-xs text-[#0a0a0a]/70">{trackCode}</p>
            <p className="text-sm font-bold">{designName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="border-4 border-[#0a0a0a] bg-white p-2 shadow-[3px_3px_0_0_#0a0a0a] active:translate-x-0.5 active:translate-y-0.5"
            aria-label="Fermer"
          >
            <X className="h-6 w-6" strokeWidth={3} />
          </button>
        </header>

        <div className="space-y-3 p-5">
          {SCRAP_REASONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              disabled={loading}
              onClick={() => onConfirm(value)}
              className="w-full border-4 border-[#0a0a0a] bg-red-500 py-5 text-lg font-black uppercase tracking-wide text-white shadow-[6px_6px_0_0_#0a0a0a] transition-transform active:translate-x-1 active:translate-y-1 active:shadow-[4px_4px_0_0_#0a0a0a] disabled:opacity-50"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
