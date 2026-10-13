/** Capacité visuelle de la jauge (pas persistée en base). */
export function computeVisualMax(
  currentQuantity: number,
  alertThreshold: number
): number {
  const baseline = Math.max(alertThreshold * 4, alertThreshold + 1);
  return Math.max(baseline, currentQuantity * 1.05, 1);
}

export function stockLevelPercent(
  currentQuantity: number,
  alertThreshold: number
): number {
  const max = computeVisualMax(currentQuantity, alertThreshold);
  const ratio = Math.min(1, Math.max(0, currentQuantity / max));
  return Math.round(ratio * 100);
}

export function isStockOk(
  currentQuantity: number,
  alertThreshold: number
): boolean {
  return currentQuantity > alertThreshold;
}

export function formatStockQuantity(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1).replace(/\.0$/, "");
}
