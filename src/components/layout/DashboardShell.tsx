import type { ReactNode } from "react";

type Props = {
  kicker: string;
  title: string;
  stats?: ReactNode;
  children: ReactNode;
};

export function DashboardShell({ kicker, title, stats, children }: Props) {
  return (
    <div className="drip-page">
      <header className="drip-header">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="drip-kicker">{kicker}</p>
            <h1 className="drip-title">{title}</h1>
          </div>
          {stats ? <div className="flex flex-wrap gap-3">{stats}</div> : null}
        </div>
      </header>
      <div className="px-4 py-8 sm:px-8">{children}</div>
    </div>
  );
}
