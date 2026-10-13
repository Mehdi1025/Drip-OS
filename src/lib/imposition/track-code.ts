/** Format DB : 1042-F2-S3 (commande, feuille, emplacement) */
export function buildImpositionTrackCode(
  orderPrefix: string | number,
  sheetIndex: number,
  slot: number
): string {
  const order = String(orderPrefix).replace(/\D/g, "") || "0";
  return `${order}-F${sheetIndex}-S${slot}`;
}

export function extractOrderPrefix(
  trackCode: string,
  fallbackShopifyId: number
): string {
  const match = trackCode.match(/^(\d+)-/);
  if (match?.[1]) return match[1];
  return String(fallbackShopifyId);
}
