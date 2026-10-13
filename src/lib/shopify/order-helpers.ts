import type { ShopifyOrderWebhookPayload } from "@/lib/shopify/types";

/** Numeric part used in track codes, e.g. #1042 → 1042 */
export function resolveOrderTrackPrefix(order: ShopifyOrderWebhookPayload): number {
  if (typeof order.order_number === "number" && order.order_number > 0) {
    return order.order_number;
  }

  const fromName = order.name.replace(/[^0-9]/g, "");
  const parsed = parseInt(fromName, 10);
  if (!Number.isNaN(parsed) && parsed > 0) {
    return parsed;
  }

  return order.id;
}

export function resolveCustomerName(order: ShopifyOrderWebhookPayload): string {
  const customer = order.customer;
  if (customer) {
    const full = [customer.first_name, customer.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (full) return full;
  }

  const addr = order.shipping_address;
  if (addr?.name?.trim()) return addr.name.trim();
  const fromAddr = [addr?.first_name, addr?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (fromAddr) return fromAddr;

  return "Client inconnu";
}

export function resolveShippingMethod(order: ShopifyOrderWebhookPayload): string {
  const line = order.shipping_lines?.[0];
  const title = line?.title?.trim();
  if (title) return title;
  const code = line?.code?.trim();
  if (code) return code;
  return "Non spécifié";
}

export function resolveDesignName(item: {
  title: string;
  variant_title: string | null;
  properties?: { name: string; value: string | null }[];
}): string {
  const designProp =
    item.properties?.find((p) =>
      ["design", "design_name", "motif"].includes(p.name.toLowerCase())
    )?.value?.trim() ?? "";

  if (designProp) return designProp;

  const variant = item.variant_title?.trim();
  if (variant && variant !== "Default Title") {
    return `${item.title} — ${variant}`;
  }

  return item.title.trim() || "Skin";
}

/** track_code format: 1042-F1-S1 (matches DB CHECK constraint) */
export function buildTrackCode(
  orderPrefix: number,
  lineItemIndex: number,
  skinIndex: number
): string {
  return `${orderPrefix}-F${lineItemIndex}-S${skinIndex}`;
}
