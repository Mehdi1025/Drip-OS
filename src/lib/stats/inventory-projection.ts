import { isPerOrderInventoryItem } from "@/lib/inventory/consume";
import type { InventoryItem } from "@/lib/inventory/types";

/**
 * Estime le nombre de jours avant seuil, à partir du rythme des 7 derniers jours.
 */
export function estimateDaysUntilThreshold(
  item: Pick<
    InventoryItem,
    "item_name" | "current_quantity" | "alert_threshold" | "usage_per_sheet"
  >,
  sheetsPerDay: number,
  ordersPerDay: number
): number | null {
  if (item.usage_per_sheet <= 0) return null;
  if (sheetsPerDay <= 0 && ordersPerDay <= 0) return null;

  const dailyUse = isPerOrderInventoryItem(item.item_name)
    ? item.usage_per_sheet * ordersPerDay
    : item.usage_per_sheet * sheetsPerDay;

  if (dailyUse <= 0) return null;

  const headroom = item.current_quantity - item.alert_threshold;
  if (headroom <= 0) return 0;

  return Math.round((headroom / dailyUse) * 10) / 10;
}
