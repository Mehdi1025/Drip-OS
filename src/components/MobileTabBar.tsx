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
  if (pathname.startsWith("/scanner")) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t-4 border-drip-ink bg-drip-paper pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Navigation mobile"
    >
      <ul className="flex">
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
                className={`flex flex-col items-center gap-0.5 py-2 text-[9px] font-black uppercase ${
                  active ? "bg-drip-volt text-drip-ink" : "text-drip-ink/55"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={2.5} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
