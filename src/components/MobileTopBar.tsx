"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

const TITLES: Record<string, string> = {
  "/imposition": "Imposition",
  "/workshop": "Atelier",
  "/scanner": "Scanner",
  "/stats": "Statistiques",
  "/inventory": "Inventaire",
  "/stock": "Inventaire",
  "/pilotage": "Statistiques",
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
    <header className="sticky top-0 z-40 flex min-h-[var(--drip-mobile-top-h)] items-center justify-between gap-2 border-b-4 border-drip-ink bg-drip-volt px-3 pb-3 pl-[calc(0.75rem+var(--drip-safe-left))] pr-[calc(0.75rem+var(--drip-safe-right))] pt-[calc(0.75rem+var(--drip-safe-top))] md:hidden">
      {onScanner ? (
        <Link
          href="/imposition"
          className="drip-touch flex shrink-0 items-center gap-1 border-2 border-drip-ink bg-drip-paper px-2 py-1.5 text-[10px] font-black uppercase"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={3} />
          Bureau
        </Link>
      ) : (
        <Link
          href="/imposition"
          className="shrink-0 border-2 border-drip-ink bg-drip-paper px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.2em]"
        >
          Drip OS
        </Link>
      )}
      <p className="truncate text-center text-sm font-black uppercase tracking-wide">
        {title}
      </p>
      {onScanner ? (
        <Link
          href="/workshop"
          className="drip-touch shrink-0 border-2 border-drip-ink bg-drip-paper px-2 py-1.5 text-[10px] font-black uppercase"
        >
          Atelier
        </Link>
      ) : (
        <span className="w-[52px] shrink-0" aria-hidden />
      )}
    </header>
  );
}
