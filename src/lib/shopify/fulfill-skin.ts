import { shopifyAdminJson, ShopifyAdminError } from "@/lib/shopify/admin-fetch";
import { normalizeShopifyNumericId } from "@/lib/shopify/numeric-id";
import { resolveTrackingCompanyFromShippingMethod } from "@/lib/shopify/tracking-company";

type FulfillmentOrderLineItem = {
  id: number;
  line_item_id: number | null;
  fulfillable_quantity: number;
};

type FulfillmentOrder = {
  id: number;
  status: string;
  line_items: FulfillmentOrderLineItem[];
};

type FulfillmentOrdersResponse = {
  fulfillment_orders: FulfillmentOrder[];
};

type CreateFulfillmentResponse = {
  fulfillment?: { id: number; status?: string };
};

export type FulfillSkinOnShopifyResult =
  | { ok: true; alreadyFulfilled?: boolean }
  | { ok: false; error: string };

const OPEN_FO_STATUSES = new Set([
  "open",
  "in_progress",
  "scheduled",
  "on_hold",
]);

function shouldSendTrackCodeAsShopifyTracking(): boolean {
  return process.env.SHOPIFY_FULFILLMENT_USE_TRACK_CODE === "true";
}

/**
 * Crée un fulfillment Shopify pour 1 unité du line_item (expédition partielle).
 */
export async function fulfillSkinUnitOnShopify(params: {
  orderShopifyId: string;
  shopifyLineItemId: string;
  trackingNumber: string;
  shippingMethod?: string | null;
}): Promise<FulfillSkinOnShopifyResult> {
  const { orderShopifyId, shopifyLineItemId, trackingNumber, shippingMethod } =
    params;
  const trackingCompany =
    resolveTrackingCompanyFromShippingMethod(shippingMethod);
  const lineItemIdStr = normalizeShopifyNumericId(shopifyLineItemId);
  if (!lineItemIdStr) {
    return { ok: false, error: "ID line item Shopify invalide." };
  }

  let fulfillmentOrders: FulfillmentOrder[];
  try {
    const data = await shopifyAdminJson<FulfillmentOrdersResponse>(
      `/orders/${orderShopifyId}/fulfillment_orders.json`
    );
    fulfillmentOrders = data.fulfillment_orders ?? [];
  } catch (e) {
    const msg =
      e instanceof ShopifyAdminError
        ? e.message
        : "Impossible de lire les fulfillment orders Shopify.";
    console.error("[shopify/fulfill] fulfillment_orders", e);
    return { ok: false, error: msg };
  }

  let targetFo: FulfillmentOrder | null = null;
  let targetLine: FulfillmentOrderLineItem | null = null;

  for (const fo of fulfillmentOrders) {
    if (!OPEN_FO_STATUSES.has(fo.status)) continue;
    for (const line of fo.line_items ?? []) {
      if (
        normalizeShopifyNumericId(line.line_item_id) === lineItemIdStr &&
        line.fulfillable_quantity > 0
      ) {
        targetFo = fo;
        targetLine = line;
        break;
      }
    }
    if (targetLine) break;
  }

  if (!targetFo || !targetLine) {
    const anyMatch = fulfillmentOrders.some((fo) =>
      (fo.line_items ?? []).some(
        (l) => normalizeShopifyNumericId(l.line_item_id) === lineItemIdStr
      )
    );
    if (anyMatch) {
      return { ok: true, alreadyFulfilled: true };
    }
    return {
      ok: false,
      error: "Line item introuvable sur la commande Shopify (fulfillment).",
    };
  }

  const quantity = Math.min(1, targetLine.fulfillable_quantity);

  try {
    const created = await shopifyAdminJson<CreateFulfillmentResponse>(
      "/fulfillments.json",
      {
        method: "POST",
        body: JSON.stringify({
          fulfillment: {
            notify_customer: true,
            message: "Expédié depuis Drip OS",
            line_items_by_fulfillment_order: [
              {
                fulfillment_order_id: targetFo.id,
                fulfillment_order_line_items: [
                  { id: targetLine.id, quantity },
                ],
              },
            ],
          },
        }),
      }
    );

    const fulfillmentId = created.fulfillment?.id;
    const sendTracking = shouldSendTrackCodeAsShopifyTracking();

    if (sendTracking && fulfillmentId) {
      await shopifyAdminJson(
        `/fulfillments/${fulfillmentId}/update_tracking.json`,
        {
          method: "POST",
          body: JSON.stringify({
            fulfillment: {
              notify_customer: false,
              tracking_info: {
                number: trackingNumber.slice(0, 255),
                company: trackingCompany,
              },
            },
          }),
        }
      );
    }

    return { ok: true };
  } catch (e) {
    console.error("[shopify/fulfill] create fulfillment", e);
    if (e instanceof ShopifyAdminError) {
      const detail = e.body?.slice(0, 280);
      return {
        ok: false,
        error: detail
          ? `Shopify ${e.status}: ${detail}`
          : `Shopify: ${e.message}`,
      };
    }
    return { ok: false, error: "Échec création fulfillment Shopify." };
  }
}
