import { shopifyAdminJson } from "@/lib/shopify/admin-fetch";
import { isShopifyAdminConfigured } from "@/lib/shopify/admin-config";
import { normalizeShopifyNumericId } from "@/lib/shopify/numeric-id";
import {
  assignLineItemIdsToSkins,
  buildSkinLineItemSlots,
} from "@/lib/shopify/skin-line-item-slots";
import type { ShopifyLineItem } from "@/lib/shopify/types";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type ShopifyOrderResponse = {
  order: { line_items: ShopifyLineItem[] };
};

export type BackfillLineItemsResult = {
  ok: true;
  ordersProcessed: number;
  skinsUpdated: number;
  errors: string[];
};

function rawBodyFromLineItems(lineItems: ShopifyLineItem[]): string {
  return `{"line_items":${JSON.stringify(lineItems)}}`;
}

export async function backfillMissingLineItemsForOrderUuid(
  orderUuid: string,
  lineItems: ShopifyLineItem[],
  rawBodyForIds: string
): Promise<number> {
  const supabase = createSupabaseAdmin();

  const { data: skins, error } = await supabase
    .from("skins")
    .select("id, design_name")
    .eq("order_id", orderUuid)
    .is("shopify_line_item_id", null)
    .order("created_at", { ascending: true });

  if (error || !skins?.length) return 0;

  const slots = buildSkinLineItemSlots(lineItems, rawBodyForIds);
  const updates = assignLineItemIdsToSkins(skins, slots);

  let count = 0;
  for (const [skinId, lineItemId] of Array.from(updates.entries())) {
    const { error: updateError } = await supabase
      .from("skins")
      .update({ shopify_line_item_id: lineItemId })
      .eq("id", skinId)
      .is("shopify_line_item_id", null);

    if (!updateError) count += 1;
  }

  return count;
}

export async function backfillFromShopifyAdminForOrder(
  orderShopifyId: string
): Promise<{ updated: number; error?: string }> {
  if (!isShopifyAdminConfigured()) {
    return { updated: 0, error: "Shopify Admin API non configurée" };
  }

  const supabase = createSupabaseAdmin();
  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .select("id")
    .eq("id_shopify", orderShopifyId)
    .maybeSingle();

  if (orderError || !orderRow) {
    return { updated: 0, error: "Commande introuvable en base" };
  }

  let lineItems: ShopifyLineItem[];
  try {
    const data = await shopifyAdminJson<ShopifyOrderResponse>(
      `/orders/${orderShopifyId}.json?fields=line_items`
    );
    lineItems = data.order?.line_items ?? [];
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur API Shopify";
    return { updated: 0, error: message };
  }

  const updated = await backfillMissingLineItemsForOrderUuid(
    orderRow.id,
    lineItems,
    rawBodyFromLineItems(lineItems)
  );

  return { updated };
}

export async function backfillAllOrdersMissingLineItems(): Promise<BackfillLineItemsResult> {
  const supabase = createSupabaseAdmin();
  const errors: string[] = [];
  let skinsUpdated = 0;
  let ordersProcessed = 0;

  const { data: orderIds, error } = await supabase
    .from("skins")
    .select("order_id")
    .is("shopify_line_item_id", null);

  if (error) {
    return {
      ok: true,
      ordersProcessed: 0,
      skinsUpdated: 0,
      errors: ["Lecture skins: " + error.message],
    };
  }

  const uniqueOrderUuids = Array.from(
    new Set((orderIds ?? []).map((r) => r.order_id))
  );

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, id_shopify")
    .in("id", uniqueOrderUuids);

  if (ordersError) {
    return {
      ok: true,
      ordersProcessed: 0,
      skinsUpdated: 0,
      errors: [ordersError.message],
    };
  }

  for (const order of orders ?? []) {
    const shopifyId = normalizeShopifyNumericId(order.id_shopify);
    if (!shopifyId) continue;

    ordersProcessed += 1;
    const result = await backfillFromShopifyAdminForOrder(shopifyId);
    if (result.error) {
      errors.push(`#${shopifyId}: ${result.error}`);
    } else {
      skinsUpdated += result.updated;
    }
  }

  return { ok: true, ordersProcessed, skinsUpdated, errors };
}
