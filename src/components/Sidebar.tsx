"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Factory,
  ScanLine,
  Package,
  BarChart3,
} from "lucide-react";

const productionNav = [
  {
    href: "/imposition",
    label: "Bureau",
    description: "Imposition",
    icon: LayoutGrid,
  },
  {
    href: "/workshop",
    label: "Atelier",
    description: "Production",
    icon: Factory,
  },
  {
    href: "/scanner",
    label: "Emballage",
    description: "Scanner",
    icon: ScanLine,
  },
  {
    href: "/inventory",
    label: "Stock",
    description: "Smart Restock",
    icon: Package,
  },
] as const;

const pilotageNav = [
  {
    href: "/stats",
    label: "Statistiques",
    description: "KPIs · graphiques",
    icon: BarChart3,
  },
] as const;

function isNavActive(pathname: string, href: string): boolean {
  if (pathname === href || pathname.startsWith(`${href}/`)) return true;
  if (href === "/stats" && pathname.startsWith("/pilotage")) return true;
  if (href === "/inventory" && pathname.startsWith("/stock")) return true;
  return false;
}

export function Sidebar() {
  const pathname = usePathname();
  const hideOnMobileScanner = pathname.startsWith("/scanner");
  const statsActive = isNavActive(pathname, "/stats");

  return (
    <aside
      className={`sticky top-0 z-30 flex h-screen w-64 shrink-0 flex-col border-r-4 border-drip-ink bg-drip-paper text-drip-ink shadow-[4px_0_0_0_var(--drip-volt)] ${
        hideOnMobileScanner ? "hidden md:flex" : "flex"
      }`}
    >
      <div className="shrink-0 border-b-4 border-drip-ink bg-drip-surface px-5 py-5">
        <div className="inline-block border-4 border-drip-ink bg-drip-volt px-2 py-0.5">
          <p className="text-[10px] font-black uppercase tracking-[0.25em]">
            Drip OS
          </p>
        </div>
        <h1 className="mt-3 text-xl font-black uppercase leading-none tracking-tight">
          Production
        </h1>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
        <p className="px-2 pb-1 pt-1 text-[9px] font-black uppercase tracking-[0.2em] text-drip-ink/40">
          Atelier
        </p>
        {productionNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isNavActive(pathname, item.href)}
          />
        ))}

        <p className="mb-1 mt-4 px-2 text-[9px] font-black uppercase tracking-[0.2em] text-drip-ink/40">
          Pilotage
        </p>
        {pilotageNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isNavActive(pathname, item.href)}
            highlight
          />
        ))}
      </nav>

      <div className="shrink-0 space-y-2 border-t-4 border-drip-ink bg-drip-volt/30 px-4 py-3">
        <Link
          href="/stats"
          className={`block border-4 border-drip-ink px-3 py-2 text-center text-[10px] font-black uppercase tracking-wide shadow-brutal-sm transition-transform hover:translate-x-0.5 hover:translate-y-0.5 ${
            statsActive ? "bg-drip-volt" : "bg-drip-surface hover:bg-drip-volt/80"
          }`}
        >
          Ouvrir statistiques
        </Link>
        <p className="text-center text-[10px] font-black uppercase tracking-widest text-drip-ink/50">
          v0.2 · stats live
        </p>
      </div>
    </aside>
  );
}

function NavLink({
  item,
  active,
  highlight = false,
}: {
  item: {
    href: string;
    label: string;
    description: string;
    icon: typeof LayoutGrid;
  };
  active: boolean;
  highlight?: boolean;
}) {
  const { href, label, description, icon: Icon } = item;

  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 border-4 px-3 py-3 transition-transform active:translate-x-0.5 active:translate-y-0.5 ${
        active
          ? "border-drip-ink bg-drip-volt text-drip-ink shadow-brutal-sm"
          : highlight
            ? "border-drip-ink/60 bg-drip-volt/35 hover:border-drip-ink hover:bg-drip-volt hover:shadow-[3px_3px_0_0_#0a0a0a]"
            : "border-transparent bg-drip-surface/90 hover:border-drip-ink hover:bg-drip-surface hover:shadow-[3px_3px_0_0_#0a0a0a]"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center border-2 border-drip-ink ${
          active ? "bg-drip-surface" : "bg-drip-paper group-hover:bg-drip-volt/40"
        }`}
      >
        <Icon className="h-5 w-5" strokeWidth={2.5} />
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-black uppercase">{label}</span>
        <span
          className={`truncate text-[10px] font-bold uppercase tracking-wide ${
            active ? "text-drip-ink/70" : "text-drip-ink/45"
          }`}
        >
          {description}
        </span>
      </span>
    </Link>
  );
}
