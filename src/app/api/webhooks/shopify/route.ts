import { NextRequest, NextResponse } from "next/server";
import { backfillMissingLineItemsForOrderUuid } from "@/lib/shopify/backfill-line-items";
import { buildSkinInsertRows } from "@/lib/shopify/create-order-skins";
import { handleShopifyOrderCancelled } from "@/lib/shopify/order-cancel-update";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import {
  handleFulfillmentEventCreate,
  handleFulfillmentUpsert,
  handleRefundMaybeReturn,
} from "@/lib/shopify/fulfillment-webhooks";
import { upsertOrderFromShopifyWebhook } from "@/lib/shopify/upsert-order-from-webhook";
import {
  extractShopifyOrderIdFromWebhookBody,
} from "@/lib/shopify/parse-webhook-ids";
import type { ShopifyOrderWebhookPayload } from "@/lib/shopify/types";
import { HMAC_HEADER, verifyShopifyWebhook } from "@/lib/shopify/verify-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOPIC_HEADER = "x-shopify-topic";
const ORDER_TOPICS = new Set([
  "orders/create",
  "orders/cancelled",
  "orders/updated",
]);

const FULFILLMENT_TOPICS = new Set([
  "fulfillments/create",
  "fulfillments/update",
  "fulfillment_events/create",
  "refunds/create",
  "returns/request",
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


async function handleOrderCreate(
  rawBody: string,
  shopifyOrder: ShopifyOrderWebhookPayload,
  idShopify: string
) {
  const supabase = createSupabaseAdmin();
  let orderId: string;
  try {
    orderId = await upsertOrderFromShopifyWebhook(shopifyOrder, idShopify);
  } catch (e) {
    console.error("[shopify/webhook] order upsert", e);
    return jsonError("Failed to insert order", 500);
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

async function handleOrderUpdated(
  shopifyOrder: ShopifyOrderWebhookPayload,
  idShopify: string
) {
  const orderUuid = await upsertOrderFromShopifyWebhook(shopifyOrder, idShopify);
  if (orderIsCancelled(shopifyOrder)) {
    const supabase = createSupabaseAdmin();
    await supabase
      .from("orders")
      .update({
        cancelled_at:
          shopifyOrder.cancelled_at ?? new Date().toISOString(),
      })
      .eq("id", orderUuid);
    const result = await handleShopifyOrderCancelled(orderUuid, idShopify);
    return NextResponse.json({
      ok: true,
      topic: "orders/updated",
      cancelled: true,
      order_id: orderUuid,
      ...result,
    });
  }
  return NextResponse.json({ ok: true, topic: "orders/updated", order_id: orderUuid });
}

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return jsonError("Server configuration error", 500);
    }

    const topic = request.headers.get(TOPIC_HEADER) ?? "orders/create";
    const supported = ORDER_TOPICS.has(topic) || FULFILLMENT_TOPICS.has(topic);
    if (!supported) {
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

    if (FULFILLMENT_TOPICS.has(topic)) {
      if (topic === "fulfillment_events/create") {
        const result = await handleFulfillmentEventCreate(rawBody);
        if (!result.ok) {
          return jsonError(result.error ?? "Fulfillment event failed", 500);
        }
        return NextResponse.json({ ok: true, topic });
      }
      if (topic === "refunds/create" || topic === "returns/request") {
        await handleRefundMaybeReturn(rawBody);
        return NextResponse.json({ ok: true, topic });
      }
      const result = await handleFulfillmentUpsert(rawBody);
      if (!result.ok) {
        return jsonError(result.error ?? "Fulfillment failed", 500);
      }
      return NextResponse.json({ ok: true, topic });
    }

    const { order: shopifyOrder, orderId: idShopify } =
      parseOrderPayload(rawBody);

    if (topic === "orders/create") {
      return handleOrderCreate(rawBody, shopifyOrder, idShopify);
    }

    if (topic === "orders/updated") {
      return handleOrderUpdated(shopifyOrder, idShopify);
    }

    const orderUuid = await upsertOrderFromShopifyWebhook(shopifyOrder, idShopify);
    await createSupabaseAdmin()
      .from("orders")
      .update({
        cancelled_at:
          shopifyOrder.cancelled_at ?? new Date().toISOString(),
      })
      .eq("id", orderUuid);
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
