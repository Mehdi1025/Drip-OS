import { backfillMissingLineItemsForOrderUuid } from "@/lib/shopify/backfill-line-items";
import { isSkinLineItem } from "@/lib/shopify/is-skin-line-item";
import {
  buildTrackCode,
  resolveCustomerName,
  resolveDesignName,
  resolveOrderTrackPrefix,
  resolveShippingMethod,
} from "@/lib/shopify/order-helpers";
import {
  extractShopifyOrderIdFromWebhookBody,
  resolveLineItemIdForWebhookRow,
} from "@/lib/shopify/parse-webhook-ids";
import type { ShopifyOrderWebhookPayload } from "@/lib/shopify/types";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export type ImportShopifyOrderResult =
  | {
      ok: true;
      id_shopify: string;
      order_id: string;
      skins_created: number;
      duplicate?: boolean;
      line_items_backfilled?: number;
      message?: string;
      track_codes?: string[];
    }
  | { ok: false; error: string };

function parseOrderPayload(rawBody: string): {
  order: ShopifyOrderWebhookPayload;
  orderId: string;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new Error("Invalid JSON payload");
  }

  const envelope =
    parsed && typeof parsed === "object" && "order" in parsed
      ? (parsed as { order: unknown }).order
      : parsed;

  if (!envelope || typeof envelope !== "object") {
    throw new Error("Payload is not a valid Shopify order");
  }

  const order = envelope as ShopifyOrderWebhookPayload;

  if (!Array.isArray(order.line_items)) {
    throw new Error("Order payload missing line_items array");
  }

  const orderId = extractShopifyOrderIdFromWebhookBody(rawBody);
  if (!orderId) {
    throw new Error("Order payload missing Shopify order id");
  }

  return { order, orderId };
}

/** Importe ou complète une commande (même logique que le webhook orders/create). */
export async function importShopifyOrderFromRawBody(
  rawBody: string
): Promise<ImportShopifyOrderResult> {
  try {
    const { order: shopifyOrder, orderId: idShopify } = parseOrderPayload(rawBody);
    const supabase = createSupabaseAdmin();
    const customerName = resolveCustomerName(shopifyOrder);
    const shippingMethod = resolveShippingMethod(shopifyOrder);
    const orderTrackPrefix = resolveOrderTrackPrefix(shopifyOrder);

    const { data: existingOrder, error: existingError } = await supabase
      .from("orders")
      .select("id")
      .eq("id_shopify", idShopify)
      .maybeSingle();

    if (existingError) {
      console.error("[shopify/import] orders lookup failed", existingError);
      return { ok: false, error: "Database error while checking order" };
    }

    let orderId: string;

    if (existingOrder) {
      orderId = existingOrder.id;
    } else {
      const { data: insertedOrder, error: insertOrderError } = await supabase
        .from("orders")
        .insert({
          id_shopify: idShopify,
          customer_name: customerName,
          shipping_method: shippingMethod,
        })
        .select("id")
        .single();

      if (insertOrderError || !insertedOrder) {
        if (insertOrderError?.code === "23505") {
          const { data: racedOrder, error: raceError } = await supabase
            .from("orders")
            .select("id")
            .eq("id_shopify", idShopify)
            .single();

          if (raceError || !racedOrder) {
            return { ok: false, error: "Failed to resolve duplicate order" };
          }

          orderId = racedOrder.id;
        } else {
          console.error("[shopify/import] orders insert failed", insertOrderError);
          return { ok: false, error: "Failed to insert order" };
        }
      } else {
        orderId = insertedOrder.id;
      }
    }

    const { count: existingSkinCount, error: skinCountError } = await supabase
      .from("skins")
      .select("id", { count: "exact", head: true })
      .eq("order_id", orderId);

    if (skinCountError) {
      return { ok: false, error: "Database error while checking skins" };
    }

    if (existingSkinCount && existingSkinCount > 0) {
      const lineItemsBackfilled = await backfillMissingLineItemsForOrderUuid(
        orderId,
        shopifyOrder.line_items,
        rawBody
      );
      return {
        ok: true,
        duplicate: true,
        id_shopify: idShopify,
        order_id: orderId,
        skins_created: 0,
        line_items_backfilled: lineItemsBackfilled,
        message: "Order already processed",
      };
    }

    const skinRows: {
      order_id: string;
      design_name: string;
      status: "pending";
      track_code: string;
      shopify_line_item_id: string | null;
    }[] = [];

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
      const lineItemId = resolveLineItemIdForWebhookRow(
        rawBody,
        shopifyOrder.line_items,
        shopifyLineIndex
      );

      for (let skinIndex = 1; skinIndex <= quantity; skinIndex++) {
        skinRows.push({
          order_id: orderId,
          design_name: designName,
          status: "pending",
          track_code: buildTrackCode(orderTrackPrefix, lineItemIndex, skinIndex),
          shopify_line_item_id: lineItemId,
        });
      }
    }

    if (skinRows.length === 0) {
      return {
        ok: true,
        id_shopify: idShopify,
        order_id: orderId,
        skins_created: 0,
        message: "Order saved, no Skin line items found",
      };
    }

    const { data: insertedSkins, error: insertSkinsError } = await supabase
      .from("skins")
      .insert(skinRows)
      .select("id, track_code");

    if (insertSkinsError) {
      console.error("[shopify/import] skins insert failed", insertSkinsError);
      return { ok: false, error: "Failed to insert skins" };
    }

    const skinsCreated = insertedSkins?.length ?? skinRows.length;
    return {
      ok: true,
      id_shopify: idShopify,
      order_id: orderId,
      skins_created: skinsCreated,
      track_codes: insertedSkins?.map((s) => s.track_code) ?? [],
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected import error";
    return { ok: false, error: message };
  }
}
