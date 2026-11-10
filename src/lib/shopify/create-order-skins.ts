import { resolveSkinLineItemMetadata } from "@/lib/shopify/line-item-properties";
import { isSkinLineItem } from "@/lib/shopify/is-skin-line-item";
import {
  buildTrackCode,
  resolveDesignName,
  resolveOrderTrackPrefix,
} from "@/lib/shopify/order-helpers";
import {
  resolveLineItemIdForWebhookRow,
} from "@/lib/shopify/parse-webhook-ids";
import type { ShopifyOrderWebhookPayload } from "@/lib/shopify/types";

export type SkinInsertRow = {
  order_id: string;
  design_name: string;
  status: "pending";
  track_code: string;
  shopify_line_item_id: string | null;
  visual_url: string | null;
  framing: string | null;
  orientation: "paysage" | "portrait" | null;
  product_handle: string | null;
  reprint_of: string | null;
};

export function buildSkinInsertRows(
  orderId: string,
  shopifyOrder: ShopifyOrderWebhookPayload,
  rawBody: string
): SkinInsertRow[] {
  const orderTrackPrefix = resolveOrderTrackPrefix(shopifyOrder);
  const rows: SkinInsertRow[] = [];
  let skinLineOrdinal = 0;

  for (
    let shopifyLineIndex = 0;
    shopifyLineIndex < shopifyOrder.line_items.length;
    shopifyLineIndex += 1
  ) {
    const item = shopifyOrder.line_items[shopifyLineIndex];
    if (!isSkinLineItem(item)) continue;

    skinLineOrdinal += 1;
    const lineItemIndex = skinLineOrdinal;
    const quantity = Math.max(0, Math.floor(Number(item.quantity) || 0));
    const designName = resolveDesignName(item);
    const meta = resolveSkinLineItemMetadata(item);
    const lineItemId = resolveLineItemIdForWebhookRow(
      rawBody,
      shopifyOrder.line_items,
      shopifyLineIndex
    );

    for (let skinIndex = 1; skinIndex <= quantity; skinIndex++) {
      rows.push({
        order_id: orderId,
        design_name: designName,
        status: "pending",
        track_code: buildTrackCode(orderTrackPrefix, lineItemIndex, skinIndex),
        shopify_line_item_id: lineItemId,
        visual_url: meta.visual_url,
        framing: meta.framing,
        orientation: meta.orientation,
        product_handle: meta.product_handle,
        reprint_of: null,
      });
    }
  }

  return rows;
}
