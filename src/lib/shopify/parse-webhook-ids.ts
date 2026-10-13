import type { ShopifyLineItem } from "@/lib/shopify/types";

/** IDs Shopify > 2^53 — extraits du JSON brut (JSON.parse les corrompt). */
export function extractShopifyOrderIdFromWebhookBody(
  rawBody: string
): string | null {
  const fromGid = rawBody.match(
    /"admin_graphql_api_id"\s*:\s*"gid:\/\/shopify\/Order\/(\d+)"/
  );
  if (fromGid?.[1]) return fromGid[1];

  const fromRoot = rawBody.match(/^\s*\{\s*"id"\s*:\s*(\d+)/);
  return fromRoot?.[1] ?? null;
}

export function extractLineItemIdFromWebhookItem(
  item: ShopifyLineItem
): string | null {
  const gid = item.admin_graphql_api_id;
  if (gid) {
    const match = gid.match(/LineItem\/(\d+)/);
    if (match?.[1]) return match[1];
  }

  if (typeof item.id === "number" && Number.isInteger(item.id) && item.id > 0) {
    if (item.id <= Number.MAX_SAFE_INTEGER) {
      return String(item.id);
    }
  }

  return null;
}

/** IDs line_item dans l’ordre du tableau `line_items` du webhook (JSON brut). */
export function extractLineItemIdsFromWebhookLineItems(
  rawBody: string
): string[] {
  const key = '"line_items"';
  const keyPos = rawBody.indexOf(key);
  if (keyPos === -1) return [];

  const arrayStart = rawBody.indexOf("[", keyPos);
  if (arrayStart === -1) return [];

  let depth = 0;
  let arrayEnd = -1;
  for (let i = arrayStart; i < rawBody.length; i++) {
    const ch = rawBody[i];
    if (ch === "[") depth += 1;
    else if (ch === "]") {
      depth -= 1;
      if (depth === 0) {
        arrayEnd = i + 1;
        break;
      }
    }
  }

  if (arrayEnd === -1) return [];

  const segment = rawBody.slice(arrayStart, arrayEnd);
  const ids: string[] = [];
  const re = /gid:\/\/shopify\/LineItem\/(\d+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(segment)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

export function resolveLineItemIdForWebhookRow(
  rawBody: string,
  lineItems: ShopifyLineItem[],
  lineIndex: number
): string | null {
  const fromSegment = extractLineItemIdsFromWebhookLineItems(rawBody);
  if (fromSegment[lineIndex]) return fromSegment[lineIndex];

  const item = lineItems[lineIndex];
  if (!item) return null;
  return extractLineItemIdFromWebhookItem(item);
}
