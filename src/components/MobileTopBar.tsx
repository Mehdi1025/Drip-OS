"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
  if (pathname.startsWith("/scanner")) {
    return null;
  }
  const title = titleForPath(pathname);

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b-4 border-drip-ink bg-drip-volt px-4 py-3 md:hidden">
      <Link
        href="/imposition"
        className="shrink-0 border-2 border-drip-ink bg-drip-paper px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.2em]"
      >
        Drip OS
      </Link>
      <p className="truncate text-sm font-black uppercase tracking-wide">
        {title}
      </p>
      <span className="w-[52px]" aria-hidden />
    </header>
  );
}
