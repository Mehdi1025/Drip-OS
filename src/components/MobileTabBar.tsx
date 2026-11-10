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

  return (
    <nav
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 px-4 pb-[calc(0.75rem+var(--drip-safe-bottom))] pt-2 md:hidden"
      aria-label="Navigation mobile"
    >
      <ul className="drip-glass-nav pointer-events-auto mx-auto flex h-[var(--drip-tab-bar-h)] max-w-md items-stretch justify-around rounded-2xl px-1">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active =
            pathname === href ||
            pathname.startsWith(`${href}/`) ||
            (href === "/stats" && pathname.startsWith("/pilotage")) ||
            (href === "/inventory" && pathname.startsWith("/stock"));

          return (
            <li key={href} className="flex flex-1 items-center justify-center">
              <Link
                href={href}
                className={`drip-touch flex flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-medium transition-colors ${
                  active
                    ? "text-drip-volt"
                    : "text-drip-muted hover:text-drip-ink"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                    active
                      ? "bg-drip-volt/15 text-drip-volt"
                      : "bg-transparent"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
