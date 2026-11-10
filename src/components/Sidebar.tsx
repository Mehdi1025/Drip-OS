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
import { BrandMark } from "@/components/BrandMark";

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
    description: "Nomenclature",
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

  return (
    <aside className="sticky top-0 z-30 hidden h-[100dvh] w-[17rem] shrink-0 flex-col border-r border-drip-border bg-drip-surface md:flex">
      <div className="shrink-0 border-b border-drip-border px-6 py-7">
        <Link href="/imposition" className="block">
          <BrandMark variant="full" />
          <p className="mt-2 text-[11px] text-drip-muted">drip os · production</p>
        </Link>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-4">
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-drip-peach">
          atelier
        </p>
        {productionNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isNavActive(pathname, item.href)}
          />
        ))}

        <p className="mb-2 mt-6 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-drip-peach">
          pilotage
        </p>
        {pilotageNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isNavActive(pathname, item.href)}
          />
        ))}
      </nav>

      <div className="shrink-0 border-t border-drip-border p-4">
        <div className="rounded-xl border border-drip-border bg-drip-paper px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-drip-volt">
            drip my card
          </p>
          <p className="font-mono text-xs text-drip-muted">v0.3 · we are target</p>
        </div>
      </div>
    </aside>
  );
}

function NavLink({
  item,
  active,
}: {
  item: {
    href: string;
    label: string;
    description: string;
    icon: typeof LayoutGrid;
  };
  active: boolean;
}) {
  const { href, label, description, icon: Icon } = item;

  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ${
        active
          ? "drip-nav-active shadow-panel"
          : "text-drip-muted hover:bg-drip-paper hover:text-drip-ink"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          active
            ? "bg-drip-volt text-white"
            : "bg-drip-paper text-drip-muted group-hover:text-drip-volt"
        }`}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-semibold">{label}</span>
        <span className="truncate text-[11px] text-drip-gray-light">
          {description}
        </span>
      </span>
    </Link>
  );
}
