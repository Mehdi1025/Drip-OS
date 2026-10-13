"use client";

import { useTransition } from "react";
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

  function handleClick() {
    startTransition(async () => {
      const result = await generateLotFromPending();
      if (result.ok) {
        onSuccess?.(result);
      } else {
        onError?.(result.error);
      }
    });
  }

  const isDisabled = disabled || pendingCount === 0 || isPending;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      className="drip-btn-volt drip-touch group flex w-full max-w-xl items-center justify-center gap-3 px-6 py-4 text-base tracking-wide shadow-brutal-lg hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-brutal active:translate-x-1 active:translate-y-1 active:shadow-brutal-sm sm:px-8 sm:py-5 sm:text-lg"
    >
      {isPending ? (
        <Loader2 className="h-6 w-6 animate-spin" strokeWidth={3} />
      ) : (
        <Zap className="h-6 w-6" strokeWidth={3} />
      )}
      {isPending ? "Génération…" : "Générer un Lot"}
    </button>
  );
}
