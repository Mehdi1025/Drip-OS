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
      className={`drip-card flex flex-col overflow-hidden ${
        ok ? "" : "border-red-500/30"
      }`}
    >
      <header className="flex items-start justify-between gap-3 border-b border-drip-border px-4 py-3">
        <div>
          <h3 className="font-display text-lg font-medium leading-tight">
            {item.item_name}
          </h3>
          <p className="mt-1 font-mono text-xs text-drip-muted">
            {formatStockQuantity(item.usage_per_sheet)} {item.unit} / feuille
            {item.usage_per_sheet === 0 ? " (ou / cmd)" : ""}
          </p>
        </div>

        {ok ? (
          <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-medium text-emerald-300">
            Stock OK
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-red-500/35 bg-red-500/15 px-2.5 py-1 text-[10px] font-medium text-red-200">
            <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
            Alerte
          </span>
        )}
      </header>

      <div className="flex-1 px-4 py-4">
        <p className="text-[10px] font-medium uppercase tracking-widest text-drip-muted">
          Quantité restante
        </p>
        <p className="font-mono text-4xl font-semibold leading-none tabular-nums">
          {formatStockQuantity(item.current_quantity)}
          <span className="ml-2 text-base font-medium text-drip-muted">
            {item.unit}
          </span>
        </p>
        <p className="mt-1 text-xs text-drip-muted">
          Seuil : {formatStockQuantity(item.alert_threshold)} {item.unit}
        </p>

        <div className="mt-4">
          <div className="mb-1 flex justify-between text-[10px] text-drip-muted">
            <span>Niveau</span>
            <span>{percent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-drip-border">
            <div
              className={`h-full transition-all duration-300 ${
                ok ? "bg-drip-volt" : "bg-red-500"
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      <footer className="space-y-3 border-t border-drip-border p-4">
        {!ok && supplierHref && (
          <a
            href={supplierHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-red-500/35 bg-red-500/15 px-4 py-3 text-center text-sm font-medium text-red-100 transition hover:bg-red-500/25"
          >
            <ExternalLink className="h-5 w-5 shrink-0" strokeWidth={2} />
            Commander chez le fournisseur
          </a>
        )}

        {!ok && !supplierHref && (
          <p className="text-center text-xs text-red-300">
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
