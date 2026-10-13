"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export function MainScrollShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isScanner = pathname.startsWith("/scanner");

  return (
    <main
      className={`drip-main-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-drip-paper ${
        isScanner ? "drip-main-scroll--scanner" : ""
      }`}
    >
      {children}
    </main>
  );
}
