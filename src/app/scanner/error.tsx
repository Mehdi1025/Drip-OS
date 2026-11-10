"use client";

export default function ScannerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-drip-paper p-8">
      <h1 className="font-display text-xl font-medium">Scanner — erreur</h1>
      <p className="max-w-md text-center text-sm text-drip-muted">
        {error.message}
      </p>
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
