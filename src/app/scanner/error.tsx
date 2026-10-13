"use client";

export default function ScannerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-drip-paper p-8 text-drip-ink">
      <h1 className="text-xl font-black uppercase">Scanner — erreur</h1>
      <p className="max-w-md text-center text-sm font-medium text-drip-ink/70">
        {error.message || "Une erreur inattendue s'est produite."}
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-drip-ink/40">{error.digest}</p>
      )}
      <button
        type="button"
        onClick={() => reset()}
        className="drip-btn-volt px-6 py-3 text-sm shadow-brutal-sm"
      >
        Réouvrir le scanner
      </button>
    </div>
  );
}
