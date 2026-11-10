import { PROMISE_HOURS } from "@/lib/delais/config";
import type { ShopifyOrderWebhookPayload } from "@/lib/shopify/types";
import {
  resolveCustomerName,
  resolveShippingMethod,
} from "@/lib/shopify/order-helpers";

export type OrderSyncRow = {
  id_shopify: number | string;
  customer_name: string;
  shipping_method: string;
  placed_at: string;
  ship_country: string | null;
  ship_zip: string | null;
  promise_due_at: string;
  cancelled_at: string | null;
};

function parseShopifyDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function buildOrderSyncRow(
  order: ShopifyOrderWebhookPayload
): OrderSyncRow {
  const placed =
    parseShopifyDate(order.created_at) ?? new Date().toISOString();
  const due = new Date(
    new Date(placed).getTime() + PROMISE_HOURS * 3600_000
  ).toISOString();

  const addr = order.shipping_address;
  const country =
    addr?.country_code?.trim().toUpperCase() ??
    (addr as { country?: string } | null)?.country?.trim().toUpperCase() ??
    null;
  const zip = addr?.zip?.trim() ?? null;

  const cancelled = parseShopifyDate(order.cancelled_at ?? null);

  return {
    id_shopify: order.id,
    customer_name: resolveCustomerName(order),
    shipping_method: resolveShippingMethod(order),
    placed_at: placed,
    ship_country: country,
    ship_zip: zip,
    promise_due_at: due,
    cancelled_at: cancelled,
  };
}
