import { buildOrderSyncRow } from "@/lib/shopify/order-sync-fields";
import type { ShopifyOrderWebhookPayload } from "@/lib/shopify/types";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
/** Crée ou met à jour une commande à partir d'un webhook Shopify. */
export async function upsertOrderFromShopifyWebhook(
  shopifyOrder: ShopifyOrderWebhookPayload,
  idShopify: string
): Promise<string> {
  const supabase = createSupabaseAdmin();
  const sync = buildOrderSyncRow(shopifyOrder);

  const { data: existing } = await supabase
    .from("orders")
    .select("id")
    .eq("id_shopify", idShopify)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("orders")
      .update({
        customer_name: sync.customer_name,
        shipping_method: sync.shipping_method,
        placed_at: sync.placed_at,
        ship_country: sync.ship_country,
        ship_zip: sync.ship_zip,
        promise_due_at: sync.promise_due_at,
        cancelled_at: sync.cancelled_at,
      })
      .eq("id", existing.id);
    return existing.id;
  }

  const { data: inserted, error } = await supabase
    .from("orders")
    .insert({
      id_shopify: sync.id_shopify,
      customer_name: sync.customer_name,
      shipping_method: sync.shipping_method,
      placed_at: sync.placed_at,
      ship_country: sync.ship_country,
      ship_zip: sync.ship_zip,
      promise_due_at: sync.promise_due_at,
      cancelled_at: sync.cancelled_at,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    if (error?.code === "23505") {
      const { data: raced } = await supabase
        .from("orders")
        .select("id")
        .eq("id_shopify", idShopify)
        .single();
      if (raced?.id) return raced.id;
    }
    throw new Error("Failed to insert order");
  }

  return inserted.id;
}
