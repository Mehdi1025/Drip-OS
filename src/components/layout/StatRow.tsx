import type { ReactNode } from "react";

/** Stats header: horizontal scroll on mobile, wrap on desktop */
export function StatRow({ children }: { children: ReactNode }) {
  return (
    <div className="drip-stat-row w-full min-w-0 sm:w-auto">
      {children}
    </div>
  );
}
