export type PeriodSlice = {
  current: number;
  previous: number;
  deltaPct: number | null;
};

export function periodDelta(current: number, previous: number): PeriodSlice {
  if (previous === 0) {
    return {
      current,
      previous,
      deltaPct: current > 0 ? 100 : null,
    };
  }
  const deltaPct = Math.round(((current - previous) / previous) * 100);
  return { current, previous, deltaPct };
}

export function formatDeltaPct(delta: number | null): string {
  if (delta === null) return "—";
  if (delta > 0) return `+${delta}%`;
  return `${delta}%`;
}

export function hoursSince(iso: string): number {
  const then = new Date(iso).getTime();
  const now = Date.now();
  return Math.max(0, (now - then) / (1000 * 60 * 60));
}

export function formatAgeHours(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${Math.round(hours)} h`;
  const days = Math.round(hours / 24);
  return `${days} j`;
}
