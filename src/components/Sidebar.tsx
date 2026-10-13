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

const navItems = [
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
  {
    href: "/stats",
    label: "Pilotage",
    description: "Statistiques",
    icon: BarChart3,
  },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const hideOnMobileScanner = pathname.startsWith("/scanner");

  return (
    <aside
      className={`sticky top-0 z-30 h-screen w-60 shrink-0 flex-col border-r-4 border-drip-ink bg-drip-paper text-drip-ink shadow-[4px_0_0_0_var(--drip-volt)] ${
        hideOnMobileScanner ? "hidden md:flex" : "flex"
      }`}
    >
      <div className="border-b-4 border-drip-ink bg-drip-surface px-5 py-5">
        <div className="inline-block border-4 border-drip-ink bg-drip-volt px-2 py-0.5">
          <p className="text-[10px] font-black uppercase tracking-[0.25em]">
            Drip OS
          </p>
        </div>
        <h1 className="mt-3 text-xl font-black uppercase leading-none tracking-tight">
          Production
        </h1>
      </div>

      <nav className="flex flex-1 flex-col gap-2 p-3">
        {navItems.map(({ href, label, description, icon: Icon }) => {
          const active =
            pathname === href ||
            pathname.startsWith(`${href}/`) ||
            (href === "/inventory" && pathname.startsWith("/stock"));

          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 border-4 px-3 py-3 transition-transform active:translate-x-0.5 active:translate-y-0.5 ${
                active
                  ? "border-drip-ink bg-drip-volt text-drip-ink shadow-brutal-sm"
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
                <span className="truncate text-sm font-black uppercase">
                  {label}
                </span>
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
        })}
      </nav>

      <div className="border-t-4 border-drip-ink bg-drip-volt/30 px-5 py-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-drip-ink/50">
          v0.1 · interne
        </p>
      </div>
    </aside>
  );
}
