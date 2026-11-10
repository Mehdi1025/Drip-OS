import { normalizeCarrierName } from "@/lib/delais/carriers";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { extractShopifyOrderIdFromWebhookBody } from "@/lib/shopify/parse-webhook-ids";

type FulfillmentPayload = {
  id?: number;
  order_id?: number;
  tracking_company?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  status?: string | null;
};

type FulfillmentEventPayload = {
  id?: number;
  order_id?: number;
  fulfillment_id?: number;
  status?: string;
  message?: string | null;
  happened_at?: string;
};

function mapDeliveryStatus(status: string | undefined): string | null {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s === "delivered") return "livre";
  if (s === "failure") return "echec";
  if (s === "in_transit" || s === "out_for_delivery") return "en_transit";
  if (s.includes("return")) return "retour";
  return null;
}

async function resolveOrderUuidByShopifyId(
  idShopify: string
): Promise<string | null> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("orders")
    .select("id")
    .eq("id_shopify", idShopify)
    .maybeSingle();
  return data?.id ?? null;
}

export async function handleFulfillmentUpsert(
  rawBody: string
): Promise<{ ok: boolean; error?: string }> {
  let payload: FulfillmentPayload;
  try {
    payload = JSON.parse(rawBody) as FulfillmentPayload;
  } catch {
    return { ok: false, error: "JSON invalide" };
  }

  const orderShopifyId =
    payload.order_id?.toString() ??
    extractShopifyOrderIdFromWebhookBody(rawBody);
  if (!orderShopifyId) {
    return { ok: false, error: "order_id manquant" };
  }

  const orderUuid = await resolveOrderUuidByShopifyId(orderShopifyId);
  if (!orderUuid) {
    return { ok: true };
  }

  const supabase = createSupabaseAdmin();
  const carrier = normalizeCarrierName(payload.tracking_company);
  const { error } = await supabase
    .from("orders")
    .update({
      carrier,
      tracking_number: payload.tracking_number?.trim() || null,
      tracking_url: payload.tracking_url?.trim() || null,
      delivery_status: "en_transit",
    })
    .eq("id", orderUuid);

  if (error) {
    console.error("[fulfillment] orders update", error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function handleFulfillmentEventCreate(
  rawBody: string
): Promise<{ ok: boolean; error?: string }> {
  let payload: FulfillmentEventPayload;
  try {
    payload = JSON.parse(rawBody) as FulfillmentEventPayload;
  } catch {
    return { ok: false, error: "JSON invalide" };
  }

  const orderShopifyId =
    payload.order_id?.toString() ??
    extractShopifyOrderIdFromWebhookBody(rawBody);
  if (!orderShopifyId) {
    return { ok: false, error: "order_id manquant" };
  }

  const orderUuid = await resolveOrderUuidByShopifyId(orderShopifyId);
  if (!orderUuid) {
    return { ok: true };
  }

  const supabase = createSupabaseAdmin();
  const shopifyId = payload.id?.toString() ?? null;
  const happenedAt = payload.happened_at
    ? new Date(payload.happened_at).toISOString()
    : new Date().toISOString();

  if (shopifyId) {
    const { error: insErr } = await supabase.from("shipment_events").insert({
      order_id: orderUuid,
      shopify_id: shopifyId,
      status: payload.status ?? "unknown",
      message: payload.message,
      happened_at: happenedAt,
      raw: payload as object,
    });
    if (insErr && insErr.code !== "23505") {
      console.error("[fulfillment_event] insert", insErr);
    }
  }

  const delivery = mapDeliveryStatus(payload.status);
  if (!delivery) return { ok: true };

  const patch: Record<string, string> = { delivery_status: delivery };
  if (delivery === "livre") {
    patch.delivered_at = happenedAt;
  }

  const { error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", orderUuid);

  if (error) {
    console.error("[fulfillment_event] orders", error);
    return { ok: false, error: error.message };
  }

  if (delivery === "retour") {
    await supabase.from("claims").insert({
      order_id: orderUuid,
      type: "retour",
      carrier: null,
      country: null,
      status: "ouvert",
      note: payload.message ?? "Retour signalé par Shopify",
    });
  }

  return { ok: true };
}

export async function handleRefundMaybeReturn(
  rawBody: string
): Promise<{ ok: boolean }> {
  let payload: { order_id?: number; refund_line_items?: unknown[] };
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    return { ok: false };
  }
  if (!payload.refund_line_items?.length || !payload.order_id) {
    return { ok: true };
  }

  const orderUuid = await resolveOrderUuidByShopifyId(
    String(payload.order_id)
  );
  if (!orderUuid) return { ok: true };

  const supabase = createSupabaseAdmin();
  const { data: order } = await supabase
    .from("orders")
    .select("carrier, ship_country")
    .eq("id", orderUuid)
    .maybeSingle();

  await supabase.from("claims").insert({
    order_id: orderUuid,
    type: "retour",
    carrier: order?.carrier ?? null,
    country: order?.ship_country ?? null,
    status: "ouvert",
    note: "Refund Shopify (lignes retournées)",
  });

  return { ok: true };
}
