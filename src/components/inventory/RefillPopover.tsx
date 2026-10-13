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
        className="flex w-full items-center justify-center gap-2 border-4 border-[#0a0a0a] bg-white px-4 py-3 text-sm font-black uppercase shadow-[4px_4px_0_0_#0a0a0a] active:translate-x-0.5 active:translate-y-0.5"
      >
        <Plus className="h-5 w-5" strokeWidth={3} />
        Réassort
      </button>

      {open && (
        <form
          onSubmit={handleSubmit}
          className="absolute bottom-full left-0 right-0 z-20 mb-2 border-4 border-[#0a0a0a] bg-[#f2ede4] p-4 shadow-[6px_6px_0_0_#0a0a0a]"
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-[#0a0a0a]/60">
            Ajouter au stock
          </p>
          <p className="mt-1 truncate text-xs font-bold">{itemName}</p>
          <div className="mt-3 flex gap-2">
            <input
              type="number"
              min="0.01"
              step="any"
              inputMode="decimal"
              placeholder="+100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="min-h-[44px] flex-1 border-4 border-[#0a0a0a] bg-white px-3 font-mono text-sm font-bold outline-none"
              autoFocus
            />
            <span className="flex items-center text-xs font-black uppercase">
              {unit}
            </span>
          </div>
          {error && (
            <p className="mt-2 text-xs font-bold text-red-700">{error}</p>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="mt-3 w-full border-4 border-[#0a0a0a] bg-[#ccff00] py-2.5 text-sm font-black uppercase disabled:opacity-50"
          >
            {isPending ? "Enregistrement…" : "Valider"}
          </button>
        </form>
      )}
    </div>
  );
}
