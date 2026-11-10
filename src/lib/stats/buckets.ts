import type { DailyCount } from "@/lib/stats/types";

export function startOfDayUtc(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
}

export function formatDayLabel(isoDate: string, short = true): string {
  const d = new Date(isoDate + "T12:00:00Z");
  return d.toLocaleDateString("fr-FR", {
    weekday: short ? "short" : "long",
    day: "numeric",
    month: short ? undefined : "short",
  });
}

export function buildDailyBuckets(dayCount: number): DailyCount[] {
  const buckets: DailyCount[] = [];
  const today = startOfDayUtc(new Date());
  const days = Math.max(1, dayCount);
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(today);
    day.setUTCDate(day.getUTCDate() - i);
    const date = day.toISOString().slice(0, 10);
    buckets.push({
      date,
      label: formatDayLabel(date),
      orders: 0,
      shipped: 0,
      lots: 0,
      sheets: 0,
    });
  }
  return buckets;
}

export function fillBucketCount(
  buckets: DailyCount[],
  rows: { ts: string }[],
  field: keyof Pick<DailyCount, "orders" | "shipped" | "lots" | "sheets">
): void {
  const index = new Map(buckets.map((d, i) => [d.date, i]));
  for (const row of rows) {
    const day = row.ts.slice(0, 10);
    const idx = index.get(day);
    if (idx !== undefined) {
      buckets[idx][field] += 1;
    }
  }
}

export function sumBucketField(
  buckets: DailyCount[],
  field: keyof Pick<DailyCount, "orders" | "shipped" | "lots" | "sheets">,
  startIdx: number,
  endIdx: number
): number {
  let total = 0;
  for (let i = startIdx; i <= endIdx && i < buckets.length; i++) {
    total += buckets[i][field];
  }
  return total;
}
