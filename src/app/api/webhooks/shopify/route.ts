import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSkinLineItem } from "@/lib/shopify/is-skin-line-item";
import {
  buildTrackCode,
  resolveCustomerName,
  resolveDesignName,
  resolveOrderTrackPrefix,
  resolveShippingMethod,
} from "@/lib/shopify/order-helpers";
import type { ShopifyOrderWebhookPayload } from "@/lib/shopify/types";
import { HMAC_HEADER, verifyShopifyWebhook } from "@/lib/shopify/verify-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOPIC_HEADER = "x-shopify-topic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function parseOrderPayload(rawBody: string): ShopifyOrderWebhookPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new Error("Invalid JSON payload");
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("id" in parsed) ||
    typeof (parsed as { id: unknown }).id !== "number"
  ) {
    throw new Error("Payload is not a valid Shopify order");
  }

  const order = parsed as ShopifyOrderWebhookPayload;

  if (!Array.isArray(order.line_items)) {
    throw new Error("Order payload missing line_items array");
  }

  return order;
}

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[shopify/webhook] SHOPIFY_WEBHOOK_SECRET is not configured");
      return jsonError("Server configuration error", 500);
    }

    const topic = request.headers.get(TOPIC_HEADER);
    if (topic && topic !== "orders/create") {
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

    const shopifyOrder = parseOrderPayload(rawBody);
    const supabase = createSupabaseAdmin();

    const idShopify = shopifyOrder.id;
    const customerName = resolveCustomerName(shopifyOrder);
    const shippingMethod = resolveShippingMethod(shopifyOrder);
    const orderTrackPrefix = resolveOrderTrackPrefix(shopifyOrder);

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
          const { data: racedOrder, error: raceError } = await supabase
            .from("orders")
            .select("id")
            .eq("id_shopify", idShopify)
            .single();

          if (raceError || !racedOrder) {
            console.error("[shopify/webhook] orders race recovery failed", raceError);
            return jsonError("Failed to resolve duplicate order", 500);
          }

          orderId = racedOrder.id;
        } else {
          console.error("[shopify/webhook] orders insert failed", insertOrderError);
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
      console.error("[shopify/webhook] skins count failed", skinCountError);
      return jsonError("Database error while checking skins", 500);
    }

    if (existingSkinCount && existingSkinCount > 0) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        order_id: orderId,
        skins_created: 0,
        message: "Order already processed",
      });
    }

    const skinLineItems = shopifyOrder.line_items.filter(isSkinLineItem);

    const skinRows: {
      order_id: string;
      design_name: string;
      status: "pending";
      track_code: string;
    }[] = [];

    skinLineItems.forEach((item, lineIndex) => {
      const lineItemIndex = lineIndex + 1;
      const quantity = Math.max(0, Math.floor(Number(item.quantity) || 0));
      const designName = resolveDesignName(item);

      for (let skinIndex = 1; skinIndex <= quantity; skinIndex++) {
        skinRows.push({
          order_id: orderId,
          design_name: designName,
          status: "pending",
          track_code: buildTrackCode(orderTrackPrefix, lineItemIndex, skinIndex),
        });
      }
    });

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
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected webhook error";
    console.error("[shopify/webhook]", error);
    return jsonError(message, 500);
  }
}
