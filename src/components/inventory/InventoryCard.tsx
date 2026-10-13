"use client";

import { AlertTriangle, ExternalLink } from "lucide-react";
import { RefillPopover } from "@/components/inventory/RefillPopover";
import type { InventoryItem } from "@/lib/inventory/types";
import {
  formatStockQuantity,
  isStockOk,
  stockLevelPercent,
} from "@/lib/inventory/stock-visual";

type Props = {
  item: InventoryItem;
  onQuantityChange: (id: string, newQuantity: number) => void;
};

export function InventoryCard({ item, onQuantityChange }: Props) {
  const ok = isStockOk(item.current_quantity, item.alert_threshold);
  const percent = stockLevelPercent(
    item.current_quantity,
    item.alert_threshold
  );
  const supplierHref = item.supplier_url?.trim() || null;

  return (
    <article
      className={`flex flex-col border-4 shadow-[8px_8px_0_0_#0a0a0a] ${
        ok
          ? "border-[#0a0a0a] bg-[#f2ede4]"
          : "border-red-600 bg-red-50"
      }`}
    >
      <header className="flex items-start justify-between gap-3 border-b-4 border-inherit px-4 py-3">
        <div>
          <h3 className="text-lg font-black uppercase leading-tight">
            {item.item_name}
          </h3>
          <p className="mt-1 font-mono text-xs text-[#0a0a0a]/60">
            {formatStockQuantity(item.usage_per_sheet)} {item.unit} / feuille
            {item.usage_per_sheet === 0 ? " (ou / cmd)" : ""}
          </p>
        </div>

        {ok ? (
          <span className="shrink-0 border-2 border-[#0a0a0a] bg-emerald-400 px-2 py-1 text-[10px] font-black uppercase">
            Stock OK
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-1 border-2 border-red-700 bg-red-600 px-2 py-1 text-[10px] font-black uppercase text-white">
            <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
            Alerte
          </span>
        )}
      </header>

      <div className="flex-1 px-4 py-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#0a0a0a]/50">
          Quantité restante
        </p>
        <p className="font-mono text-4xl font-black leading-none">
          {formatStockQuantity(item.current_quantity)}
          <span className="ml-2 text-base font-bold uppercase">
            {item.unit}
          </span>
        </p>
        <p className="mt-1 text-xs font-bold text-[#0a0a0a]/45">
          Seuil : {formatStockQuantity(item.alert_threshold)} {item.unit}
        </p>

        <div className="mt-4">
          <div className="mb-1 flex justify-between text-[10px] font-black uppercase">
            <span>Niveau</span>
            <span>{percent}%</span>
          </div>
          <div className="h-4 border-4 border-[#0a0a0a] bg-white p-0.5">
            <div
              className={`h-full transition-all duration-300 ${
                ok ? "bg-[#ccff00]" : "bg-red-500"
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      <footer className="space-y-3 border-t-4 border-inherit p-4">
        {!ok && supplierHref && (
          <a
            href={supplierHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[52px] items-center justify-center gap-2 border-4 border-red-800 bg-red-600 px-4 py-3 text-center text-sm font-black uppercase text-white shadow-[5px_5px_0_0_#0a0a0a] active:translate-x-0.5 active:translate-y-0.5"
          >
            <ExternalLink className="h-5 w-5 shrink-0" strokeWidth={3} />
            Commander chez le fournisseur
          </a>
        )}

        {!ok && !supplierHref && (
          <p className="text-center text-xs font-bold text-red-800">
            URL fournisseur manquante
          </p>
        )}

        <RefillPopover
          itemId={item.id}
          itemName={item.item_name}
          unit={item.unit}
          onRefilled={(newQuantity) => onQuantityChange(item.id, newQuantity)}
        />
      </footer>
    </article>
  );
}
