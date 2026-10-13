"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Factory,
  ScanLine,
  BarChart3,
  Package,
} from "lucide-react";

const tabs = [
  { href: "/imposition", icon: LayoutGrid, label: "Bureau" },
  { href: "/workshop", icon: Factory, label: "Atelier" },
  { href: "/scanner", icon: ScanLine, label: "Scan" },
  { href: "/stats", icon: BarChart3, label: "Stats" },
  { href: "/inventory", icon: Package, label: "Stock" },
] as const;

export function MobileTabBar() {
  const pathname = usePathname();
  const onScanner = pathname.startsWith("/scanner");

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 h-[calc(var(--drip-tab-bar-h)+var(--drip-safe-bottom))] border-t-4 border-drip-ink bg-drip-paper pb-[var(--drip-safe-bottom)] pl-[var(--drip-safe-left)] pr-[var(--drip-safe-right)] lg:hidden ${
        onScanner ? "pointer-events-none opacity-0" : ""
      }`}
      aria-label="Navigation mobile"
      aria-hidden={onScanner}
    >
      <ul className="flex h-[var(--drip-tab-bar-h)]">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active =
            pathname === href ||
            pathname.startsWith(`${href}/`) ||
            (href === "/stats" && pathname.startsWith("/pilotage")) ||
            (href === "/inventory" && pathname.startsWith("/stock"));

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`drip-touch flex flex-col items-center justify-center gap-0.5 py-2.5 text-[9px] font-black uppercase leading-none ${
                  active ? "bg-drip-volt text-drip-ink" : "text-drip-ink/55"
                }`}
              >
                <Icon className="h-6 w-6" strokeWidth={2.5} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
