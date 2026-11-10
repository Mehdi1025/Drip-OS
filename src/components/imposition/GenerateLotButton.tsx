"use client";

import { useState, useTransition } from "react";
import { Loader2, Zap } from "lucide-react";
import {
  generateLotFromPending,
  type GenerateLotResult,
} from "@/app/imposition/actions";

type Props = {
  disabled?: boolean;
  pendingCount: number;
  onSuccess?: (result: Extract<GenerateLotResult, { ok: true }>) => void;
  onError?: (message: string) => void;
};

export function GenerateLotButton({
  disabled,
  pendingCount,
  onSuccess,
  onError,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [prioritizeUrgent, setPrioritizeUrgent] = useState(true);

  function handleClick() {
    startTransition(async () => {
      const result = await generateLotFromPending(prioritizeUrgent);
      if (result.ok) {
        onSuccess?.(result);
      } else {
        onError?.(result.error);
      }
    });
  }

  const isDisabled = disabled || pendingCount === 0 || isPending;

  return (
    <div className="w-full max-w-xl space-y-3">
      <label className="flex items-center gap-2 text-xs text-drip-muted">
        <input
          type="checkbox"
          checked={prioritizeUrgent}
          onChange={(e) => setPrioritizeUrgent(e.target.checked)}
          disabled={isPending}
        />
        Mettre les commandes urgentes / en retard en premier
      </label>
      <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      className="drip-btn-volt drip-touch group flex w-full items-center justify-center gap-3 px-6 py-4 text-base sm:px-8 sm:py-5 sm:text-lg"
    >
      {isPending ? (
        <Loader2 className="h-6 w-6 animate-spin" strokeWidth={3} />
      ) : (
        <Zap className="h-6 w-6" strokeWidth={3} />
      )}
      {isPending ? "Génération…" : "Générer un Lot"}
    </button>
    </div>
  );
}
