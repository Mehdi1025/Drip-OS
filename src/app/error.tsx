"use client";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-mesh-hero bg-drip-paper p-8 text-drip-ink">
      <h1 className="font-display text-2xl font-medium">Erreur Drip OS</h1>
      <p className="max-w-md text-center text-sm text-drip-muted">
        {error.message || "Une erreur est survenue au chargement."}
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-drip-muted/60">{error.digest}</p>
      )}
      <button
        type="button"
        onClick={() => reset()}
        className="drip-btn-volt px-6 py-3 text-sm"
      >
        Réessayer
      </button>
    </div>
  );
}
