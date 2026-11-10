"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

const TITLES: Record<string, string> = {
  "/imposition": "Imposition",
  "/workshop": "Atelier",
  "/scanner": "Scanner",
  "/stats": "Statistiques",
  "/inventory": "Stock",
  "/stock": "Stock",
  "/pilotage": "Statistiques",
  "/delais": "Délais",
};

function titleForPath(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  for (const [path, title] of Object.entries(TITLES)) {
    if (pathname.startsWith(path + "/")) return title;
  }
  return "Drip OS";
}

export function MobileTopBar() {
  const pathname = usePathname();
  const title = titleForPath(pathname);
  const onScanner = pathname.startsWith("/scanner");

  return (
    <header className="drip-glass-nav drip-gutter-x sticky top-0 z-40 flex min-h-[var(--drip-mobile-top-h)] items-center justify-between gap-3 border-b-0 py-3 pt-[calc(0.65rem+var(--drip-safe-top))] md:hidden">
      {onScanner ? (
        <Link
          href="/imposition"
          className="drip-touch flex shrink-0 items-center gap-1.5 rounded-lg border border-drip-border bg-drip-elevated px-2.5 py-2 text-xs font-medium text-drip-ink"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          Bureau
        </Link>
      ) : (
        <Link href="/imposition" className="shrink-0" aria-label="Drip OS">
          <BrandMark size={32} className="rounded-lg" />
        </Link>
      )}
      <p className="truncate text-center font-display text-sm font-medium tracking-tight">
        {title}
      </p>
      {onScanner ? (
        <Link
          href="/workshop"
          className="drip-touch shrink-0 rounded-lg border border-drip-border bg-drip-elevated px-2.5 py-2 text-xs font-medium"
        >
          Atelier
        </Link>
      ) : (
        <span className="w-[52px] shrink-0" aria-hidden />
      )}
    </header>
  );
}
