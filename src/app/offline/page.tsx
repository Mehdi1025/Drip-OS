import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-drip-paper p-8 text-center">
      <h1 className="text-2xl font-black uppercase">Hors ligne</h1>
      <p className="max-w-sm text-sm font-medium text-drip-ink/70">
        Pas de connexion. Reconnecte-toi pour synchroniser Shopify et Supabase.
      </p>
      <Link href="/imposition" className="drip-btn-volt px-6 py-3 text-sm shadow-brutal-sm">
        Réessayer
      </Link>
    </div>
  );
}
