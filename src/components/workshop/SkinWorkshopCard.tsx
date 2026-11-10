"use client";

import { Check, Trash2 } from "lucide-react";
import type { WorkshopSkin } from "@/lib/workshop/types";

type Props = {
  skin: WorkshopSkin;
  slotLabel: string;
  disabled?: boolean;
  onOk: () => void;
  onScrap: () => void;
};

export function SkinWorkshopCard({
  skin,
  slotLabel,
  disabled,
  onOk,
  onScrap,
}: Props) {
  return (
    <article className="drip-card flex min-h-[280px] flex-col overflow-hidden">
      <header className="border-b border-drip-border bg-drip-lilac px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="drip-chip font-mono text-sm">{slotLabel}</span>
          <span className="font-mono text-xs text-drip-muted">
            {skin.track_code}
          </span>
        </div>
      </header>

      <div className="flex flex-1 flex-col px-4 py-4">
        <p className="font-display text-xl font-medium leading-tight">
          {skin.design_name}
        </p>
        <p className="mt-2 text-sm text-drip-muted">{skin.customer_name}</p>
        <p className="mt-auto pt-4 text-[11px] uppercase tracking-widest text-drip-muted">
          {skin.status}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 border-t border-drip-border p-4 sm:grid-cols-2">
        <button
          type="button"
          disabled={disabled}
          onClick={onOk}
          className="drip-btn-volt flex min-h-[64px] items-center justify-center gap-2 px-4 py-3 text-sm disabled:opacity-45"
        >
          <Check className="h-6 w-6" strokeWidth={2.5} />
          Contrôle OK
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onScrap}
          className="flex min-h-[64px] items-center justify-center gap-2 rounded-xl border border-red-500/35 bg-red-500/15 px-4 py-3 text-sm font-medium text-red-200 transition hover:bg-red-500/25 disabled:opacity-45"
        >
          <Trash2 className="h-6 w-6" strokeWidth={2.5} />
          Rebut
        </button>
      </div>
    </article>
  );
}
