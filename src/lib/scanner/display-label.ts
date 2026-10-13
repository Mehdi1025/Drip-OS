import type { ScannedSkinPayload } from "@/lib/scanner/types";

/** Libellé principal affiché après scan (testable sans UI). */
export function buildScanDisplayLabel(payload: ScannedSkinPayload): string {
  return `Commande #${payload.orderShopifyId} - 1x ${payload.designName}`;
}
