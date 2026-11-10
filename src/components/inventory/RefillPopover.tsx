"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import {
  refillInventoryItem,
  setInventoryQuantity,
} from "@/app/inventory/actions";

type Mode = "add" | "set";

type Props = {
  itemId: string;
  itemName: string;
  unit: string;
  currentQuantity: number;
  onRefilled: (newQuantity: number) => void;
};

export function RefillPopover({
  itemId,
  itemName,
  unit,
  currentQuantity,
  onRefilled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("add");
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

    if (!Number.isFinite(value)) {
      setError("Saisis une quantité valide.");
      return;
    }

    startTransition(async () => {
      if (mode === "add") {
        if (value <= 0) {
          setError("Quantité à ajouter > 0.");
          return;
        }
        const result = await refillInventoryItem(itemId, value);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        onRefilled(result.newQuantity);
      } else {
        if (value < 0) {
          setError("La quantité ne peut pas être négative.");
          return;
        }
        const result = await setInventoryQuantity(itemId, value);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        onRefilled(result.newQuantity);
      }

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
        Mettre à jour le stock
      </button>

      {open && (
        <form
          onSubmit={handleSubmit}
          className="drip-glass-nav absolute bottom-full left-0 right-0 z-20 mb-2 rounded-xl p-4"
        >
          <p className="text-[10px] font-medium uppercase tracking-widest text-drip-muted">
            Stock
          </p>
          <p className="mt-1 truncate text-xs">{itemName}</p>
          <p className="mt-0.5 font-mono text-[10px] text-drip-muted">
            Actuel : {currentQuantity} {unit}
          </p>

          <div className="mt-3 flex rounded-lg border border-drip-border p-0.5">
            <button
              type="button"
              onClick={() => setMode("add")}
              className={`flex-1 rounded-md py-1.5 text-[11px] font-medium transition ${
                mode === "add"
                  ? "bg-drip-volt/20 text-drip-ink"
                  : "text-drip-muted hover:text-drip-ink"
              }`}
            >
              Ajouter
            </button>
            <button
              type="button"
              onClick={() => setMode("set")}
              className={`flex-1 rounded-md py-1.5 text-[11px] font-medium transition ${
                mode === "set"
                  ? "bg-drip-volt/20 text-drip-ink"
                  : "text-drip-muted hover:text-drip-ink"
              }`}
            >
              Définir
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            <input
              type="number"
              min={mode === "add" ? "0.01" : "0"}
              step="any"
              inputMode="decimal"
              placeholder={mode === "add" ? "+100" : String(currentQuantity)}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="min-h-[44px] flex-1 rounded-lg border border-drip-border bg-drip-paper px-3 font-mono text-sm outline-none ring-drip-volt/30 focus:ring-2"
              autoFocus
            />
            <span className="flex items-center text-xs text-drip-muted">
              {unit}
            </span>
          </div>
          {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
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
