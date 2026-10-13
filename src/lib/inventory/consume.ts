import type {
  InventoryDeduction,
  InventoryItem,
  LotConsumptionContext,
} from "@/lib/inventory/types";

/** Enveloppes : consommation = 1 unité par commande distincte dans le lot. */
export function isEnvelopeInventoryItem(itemName: string): boolean {
  return itemName.toLowerCase().includes("enveloppe");
}

export function computeConsumedQuantity(
  item: InventoryItem,
  context: LotConsumptionContext
): number {
  if (isEnvelopeInventoryItem(item.item_name)) {
    const perOrder = item.usage_per_sheet > 0 ? item.usage_per_sheet : 1;
    return perOrder * context.distinctOrderCount;
  }

  return item.usage_per_sheet * context.sheetCount;
}

export function planInventoryDeductions(
  items: InventoryItem[],
  context: LotConsumptionContext
): InventoryDeduction[] {
  return items.map((item) => {
    const consumed = computeConsumedQuantity(item, context);
    const previousQuantity = item.current_quantity;
    const newQuantity = previousQuantity - consumed;
    const belowThreshold = newQuantity <= item.alert_threshold;

    return {
      item,
      consumed,
      previousQuantity,
      newQuantity,
      belowThreshold,
    };
  });
}

export function formatQuantity(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, "");
}

export function buildStockAlertMessage(deduction: InventoryDeduction): string {
  const { item, newQuantity } = deduction;
  const supplier = item.supplier_url?.trim() || "—";
  return (
    `🚨 ALERTE RUPTURE : Il reste moins de ${formatQuantity(newQuantity)} ${item.unit} de ${item.item_name}. ` +
    `Recommandez vite ici : ${supplier}`
  );
}
