import type {
  InventoryDeduction,
  InventoryItem,
  LotConsumptionContext,
} from "@/lib/inventory/types";

/** Consommation × nombre de commandes distinctes dans le lot (kit client / expédition). */
const PER_ORDER_KEYWORDS = [
  "enveloppe",
  "lingette",
  "nfc",
  "puce",
  "sticker",
  "ouvre-moi",
  "carte de pose",
  "carte merci",
  "étiquette d'expédition",
  "etiquette d'expedition",
] as const;

export function isPerOrderInventoryItem(itemName: string): boolean {
  const lower = itemName.toLowerCase();
  return PER_ORDER_KEYWORDS.some((k) => lower.includes(k));
}

/** @deprecated Utiliser isPerOrderInventoryItem */
export function isEnvelopeInventoryItem(itemName: string): boolean {
  return isPerOrderInventoryItem(itemName);
}

/**
 * - Par feuille A4 imposée : usage_per_sheet × sheetCount (vinyle, lamination, film transfert…)
 * - Par commande dans le lot : usage_per_sheet (défaut 1) × distinctOrderCount (kit + expédition)
 * - usage_per_sheet = 0 : suivi manuel uniquement (lame, tapis, encres)
 */
export function computeConsumedQuantity(
  item: InventoryItem,
  context: LotConsumptionContext
): number {
  if (item.usage_per_sheet <= 0) {
    return 0;
  }

  if (isPerOrderInventoryItem(item.item_name)) {
    return item.usage_per_sheet * context.distinctOrderCount;
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
