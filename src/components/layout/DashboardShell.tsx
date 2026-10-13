import type { ReactNode } from "react";
import { StatRow } from "@/components/layout/StatRow";

type Props = {
  kicker: string;
  title: string;
  stats?: ReactNode;
  children: ReactNode;
};

export function DashboardShell({ kicker, title, stats, children }: Props) {
  return (
    <div className="drip-page min-h-full">
      <header className="drip-header">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <p className="drip-kicker">{kicker}</p>
            <h1 className="drip-title break-words">{title}</h1>
          </div>
          {stats ? <StatRow>{stats}</StatRow> : null}
        </div>
      </header>
      <div className="px-4 py-6 sm:px-8 sm:py-8">{children}</div>
    </div>
  );
}
