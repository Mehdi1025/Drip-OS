import type { ReactNode } from "react";

/** Stats header: horizontal scroll on mobile, wrap on desktop */
export function StatRow({ children }: { children: ReactNode }) {
  return (
    <div className="drip-stat-row -mx-1 w-full min-w-0 px-1 sm:mx-0 sm:w-auto sm:px-0">
      {children}
    </div>
  );
}
