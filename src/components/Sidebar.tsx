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

  return (
    <aside className="sticky top-0 z-30 hidden h-[100dvh] w-[17rem] shrink-0 flex-col border-r border-drip-border bg-drip-paper/90 backdrop-blur-2xl md:flex">
      <div className="shrink-0 border-b border-drip-border px-6 py-7">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-volt shadow-glow-sm">
            <span className="font-display text-sm font-bold text-drip-paper">
              D
            </span>
            <span className="absolute inset-0 rounded-xl ring-1 ring-white/20" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold tracking-tight">
              Drip OS
            </p>
            <p className="text-[11px] text-drip-muted">Production studio</p>
          </div>
        </div>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-4">
        <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.22em] text-drip-muted">
          Atelier
        </p>
        {productionNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isNavActive(pathname, item.href)}
          />
        ))}

        <p className="mb-2 mt-6 px-3 text-[10px] font-medium uppercase tracking-[0.22em] text-drip-muted">
          Pilotage
        </p>
        {pilotageNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isNavActive(pathname, item.href)}
          />
        ))}
      </nav>

      <div className="shrink-0 space-y-3 border-t border-drip-border p-4">
        <div className="rounded-xl border border-drip-border bg-drip-surface px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-widest text-drip-muted">
            Session
          </p>
          <p className="font-mono text-xs text-drip-ink/80">v0.3 · PWA ready</p>
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
          ? "bg-drip-volt/[0.12] text-drip-ink shadow-glow-sm ring-1 ring-drip-volt/25"
          : "text-drip-muted hover:bg-white/[0.04] hover:text-drip-ink"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
          active
            ? "bg-drip-volt/20 text-drip-volt"
            : "bg-drip-elevated text-drip-muted group-hover:text-drip-ink"
        }`}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-medium">{label}</span>
        <span className="truncate text-[11px] text-drip-muted">{description}</span>
      </span>
      {active && (
        <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-drip-volt shadow-[0_0_8px_#d8ff52]" />
      )}
    </Link>
  );
}
