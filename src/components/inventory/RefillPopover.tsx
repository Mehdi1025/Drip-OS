"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { refillInventoryItem } from "@/app/inventory/actions";

type Props = {
  itemId: string;
  itemName: string;
  unit: string;
  onRefilled: (newQuantity: number) => void;
};

export function RefillPopover({ itemId, itemName, unit, onRefilled }: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const value = parseFloat(amount.replace(",", "."));

    startTransition(async () => {
      const result = await refillInventoryItem(itemId, value);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onRefilled(result.newQuantity);
      setAmount("");
      setOpen(false);
    });
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="drip-btn-volt flex w-full items-center justify-center gap-2 py-3 text-sm"
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} />
        Réassort
      </button>

      {open && (
        <form
          onSubmit={handleSubmit}
          className="drip-glass-nav absolute bottom-full left-0 right-0 z-20 mb-2 rounded-xl p-4"
        >
          <p className="text-[10px] font-medium uppercase tracking-widest text-drip-muted">
            Ajouter au stock
          </p>
          <p className="mt-1 truncate text-xs">{itemName}</p>
          <div className="mt-3 flex gap-2">
            <input
              type="number"
              min="0.01"
              step="any"
              inputMode="decimal"
              placeholder="+100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="min-h-[44px] flex-1 rounded-lg border border-drip-border bg-drip-paper px-3 font-mono text-sm outline-none ring-drip-volt/30 focus:ring-2"
              autoFocus
            />
            <span className="flex items-center text-xs text-drip-muted">
              {unit}
            </span>
          </div>
          {error && (
            <p className="mt-2 text-xs text-red-300">{error}</p>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="drip-btn-volt mt-3 w-full py-2.5 text-sm disabled:opacity-50"
          >
            {isPending ? "Enregistrement…" : "Valider"}
          </button>
        </form>
      )}
    </div>
  );
}
