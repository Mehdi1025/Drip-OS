import { NextRequest, NextResponse } from "next/server";
import { backfillMissingLineItemsForOrderUuid } from "@/lib/shopify/backfill-line-items";
import { buildSkinInsertRows } from "@/lib/shopify/create-order-skins";
import { handleShopifyOrderCancelled } from "@/lib/shopify/order-cancel-update";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import {
  resolveCustomerName,
  resolveShippingMethod,
} from "@/lib/shopify/order-helpers";
import {
  extractShopifyOrderIdFromWebhookBody,
} from "@/lib/shopify/parse-webhook-ids";
import type { ShopifyOrderWebhookPayload } from "@/lib/shopify/types";
import { HMAC_HEADER, verifyShopifyWebhook } from "@/lib/shopify/verify-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOPIC_HEADER = "x-shopify-topic";
const SUPPORTED_TOPICS = new Set([
  "orders/create",
  "orders/cancelled",
  "orders/updated",
]);

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

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

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Payload is not a valid Shopify order");
  }

  const order = parsed as ShopifyOrderWebhookPayload;

  if (!Array.isArray(order.line_items)) {
    throw new Error("Order payload missing line_items array");
  }

  const orderId = extractShopifyOrderIdFromWebhookBody(rawBody);
  if (!orderId) {
    throw new Error("Order payload missing Shopify order id");
  }

  return { order, orderId };
}

function orderIsCancelled(order: ShopifyOrderWebhookPayload): boolean {
  const raw = order as ShopifyOrderWebhookPayload & {
    cancelled_at?: string | null;
    cancel_reason?: string | null;
  };
  return Boolean(raw.cancelled_at);
}

async function resolveOrderUuid(
  idShopify: string,
  shopifyOrder: ShopifyOrderWebhookPayload
): Promise<string> {
  const supabase = createSupabaseAdmin();
  const { data: existing } = await supabase
    .from("orders")
    .select("id")
    .eq("id_shopify", idShopify)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: inserted, error } = await supabase
    .from("orders")
    .insert({
      id_shopify: idShopify,
      customer_name: resolveCustomerName(shopifyOrder),
      shipping_method: resolveShippingMethod(shopifyOrder),
    })
    .select("id")
    .single();

  if (error || !inserted) {
    throw new Error("Failed to insert order");
  }
  return inserted.id;
}

async function handleOrderCreate(
  rawBody: string,
  shopifyOrder: ShopifyOrderWebhookPayload,
  idShopify: string
) {
  const supabase = createSupabaseAdmin();
  const customerName = resolveCustomerName(shopifyOrder);
  const shippingMethod = resolveShippingMethod(shopifyOrder);

  const { data: existingOrder, error: existingError } = await supabase
    .from("orders")
    .select("id")
    .eq("id_shopify", idShopify)
    .maybeSingle();

  if (existingError) {
    console.error("[shopify/webhook] orders lookup failed", existingError);
    return jsonError("Database error while checking order", 500);
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
        const { data: racedOrder } = await supabase
          .from("orders")
          .select("id")
          .eq("id_shopify", idShopify)
          .single();
        if (!racedOrder) {
          return jsonError("Failed to resolve duplicate order", 500);
        }
        orderId = racedOrder.id;
      } else {
        return jsonError("Failed to insert order", 500);
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
    return jsonError("Database error while checking skins", 500);
  }

  if (existingSkinCount && existingSkinCount > 0) {
    const lineItemsBackfilled = await backfillMissingLineItemsForOrderUuid(
      orderId,
      shopifyOrder.line_items,
      rawBody
    );
    return NextResponse.json({
      ok: true,
      duplicate: true,
      order_id: orderId,
      skins_created: 0,
      line_items_backfilled: lineItemsBackfilled,
    });
  }

  const skinRows = buildSkinInsertRows(orderId, shopifyOrder, rawBody);

  if (skinRows.length === 0) {
    return NextResponse.json({
      ok: true,
      order_id: orderId,
      skins_created: 0,
      message: "Order saved, no Skin line items found",
    });
  }

  const { data: insertedSkins, error: insertSkinsError } = await supabase
    .from("skins")
    .insert(skinRows)
    .select("id, track_code");

  if (insertSkinsError) {
    console.error("[shopify/webhook] skins insert failed", insertSkinsError);
    return jsonError("Failed to insert skins", 500);
  }

  return NextResponse.json({
    ok: true,
    order_id: orderId,
    skins_created: insertedSkins?.length ?? skinRows.length,
    track_codes: insertedSkins?.map((s) => s.track_code) ?? [],
  });
}

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return jsonError("Server configuration error", 500);
    }

    const topic = request.headers.get(TOPIC_HEADER) ?? "orders/create";
    if (!SUPPORTED_TOPICS.has(topic)) {
      return jsonError(`Unsupported webhook topic: ${topic}`, 400);
    }

    const rawBody = await request.text();
    if (!rawBody) {
      return jsonError("Empty request body", 400);
    }

    const hmacHeader = request.headers.get(HMAC_HEADER);
    if (!verifyShopifyWebhook(rawBody, hmacHeader, webhookSecret)) {
      return jsonError("Invalid HMAC signature", 401);
    }

    const { order: shopifyOrder, orderId: idShopify } =
      parseOrderPayload(rawBody);

    if (topic === "orders/create") {
      return handleOrderCreate(rawBody, shopifyOrder, idShopify);
    }

    const shouldCancel =
      topic === "orders/cancelled" || orderIsCancelled(shopifyOrder);

    if (!shouldCancel) {
      return NextResponse.json({ ok: true, ignored: true, topic });
    }

    const orderUuid = await resolveOrderUuid(idShopify, shopifyOrder);
    const result = await handleShopifyOrderCancelled(orderUuid, idShopify);

    return NextResponse.json({
      ok: true,
      topic,
      order_id: orderUuid,
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected webhook error";
    console.error("[shopify/webhook]", error);
    return jsonError(message, 500);
  }
}
