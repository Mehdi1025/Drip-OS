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
    <article className="flex min-h-[280px] flex-col border-4 border-[#0a0a0a] bg-white shadow-[8px_8px_0_0_#0a0a0a]">
      <header className="border-b-4 border-[#0a0a0a] bg-[#ccff00] px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded border-2 border-[#0a0a0a] bg-white px-2 py-0.5 font-mono text-sm font-black">
            {slotLabel}
          </span>
          <span className="font-mono text-xs font-bold">{skin.track_code}</span>
        </div>
      </header>

      <div className="flex flex-1 flex-col px-4 py-4">
        <p className="text-xl font-black leading-tight text-[#0a0a0a]">
          {skin.design_name}
        </p>
        <p className="mt-2 text-sm font-bold uppercase tracking-wide text-[#0a0a0a]/50">
          {skin.customer_name}
        </p>
        <p className="mt-auto pt-4 text-xs font-black uppercase text-[#0a0a0a]/40">
          {skin.status}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 border-t-4 border-[#0a0a0a] p-4 sm:grid-cols-2">
        <button
          type="button"
          disabled={disabled}
          onClick={onOk}
          className="flex min-h-[72px] items-center justify-center gap-2 border-4 border-[#0a0a0a] bg-[#ccff00] px-4 py-4 text-base font-black uppercase shadow-[5px_5px_0_0_#0a0a0a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[3px_3px_0_0_#0a0a0a] disabled:opacity-45"
        >
          <Check className="h-7 w-7" strokeWidth={3} />
          Contrôle OK
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onScrap}
          className="flex min-h-[72px] items-center justify-center gap-2 border-4 border-[#0a0a0a] bg-red-600 px-4 py-4 text-base font-black uppercase text-white shadow-[5px_5px_0_0_#0a0a0a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[3px_3px_0_0_#0a0a0a] disabled:opacity-45"
        >
          <Trash2 className="h-7 w-7" strokeWidth={3} />
          Rebut
        </button>
      </div>
    </article>
  );
}
