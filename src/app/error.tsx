"use client";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-drip-paper p-8 text-drip-ink">
      <h1 className="text-2xl font-black uppercase">Erreur Drip OS</h1>
      <p className="max-w-md text-center text-sm font-medium text-drip-ink/70">
        {error.message || "Une erreur est survenue au chargement."}
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-drip-ink/40">{error.digest}</p>
      )}
      <button
        type="button"
        onClick={() => reset()}
        className="drip-btn-volt px-6 py-3 text-sm shadow-brutal-sm"
      >
        Réessayer
      </button>
    </div>
  );
}
