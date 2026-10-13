import { isSkinLineItem } from "@/lib/shopify/is-skin-line-item";
import { resolveDesignName } from "@/lib/shopify/order-helpers";
import { resolveLineItemIdForWebhookRow } from "@/lib/shopify/parse-webhook-ids";
import type { ShopifyLineItem } from "@/lib/shopify/types";

export type SkinLineItemSlot = {
  designName: string;
  lineItemId: string | null;
};

/** Une entrée par unité physique (qty), dans l’ordre webhook / Admin API. */
export function buildSkinLineItemSlots(
  lineItems: ShopifyLineItem[],
  rawBodyForLineItemIds: string
): SkinLineItemSlot[] {
  const slots: SkinLineItemSlot[] = [];

  for (let lineIndex = 0; lineIndex < lineItems.length; lineIndex += 1) {
    const item = lineItems[lineIndex];
    if (!isSkinLineItem(item)) continue;

    const lineItemId = resolveLineItemIdForWebhookRow(
      rawBodyForLineItemIds,
      lineItems,
      lineIndex
    );
    const designName = resolveDesignName(item);
    const quantity = Math.max(0, Math.floor(Number(item.quantity) || 0));

    for (let u = 0; u < quantity; u += 1) {
      slots.push({ designName, lineItemId });
    }
  }

  return slots;
}

export function assignLineItemIdsToSkins(
  skins: { id: string; design_name: string }[],
  slots: SkinLineItemSlot[]
): Map<string, string> {
  const updates = new Map<string, string>();
  if (skins.length === 0 || slots.length === 0) return updates;

  const skinsByDesign = groupBy(skins, (s) => s.design_name);
  const slotsByDesign = groupBy(slots, (s) => s.designName);

  for (const [design, skinList] of Array.from(skinsByDesign.entries())) {
    const slotList = slotsByDesign.get(design) ?? [];
    for (let i = 0; i < skinList.length; i += 1) {
      const slot = slotList[i] ?? slotList[0];
      const lineItemId = slot?.lineItemId;
      if (lineItemId) updates.set(skinList[i].id, lineItemId);
    }
  }

  if (updates.size === 0 && skins.length === slots.length) {
    const orderedSkins = [...skins];
    for (let i = 0; i < orderedSkins.length; i += 1) {
      const lineItemId = slots[i]?.lineItemId;
      if (lineItemId) updates.set(orderedSkins[i].id, lineItemId);
    }
  }

  return updates;
}

function groupBy<T, K extends string>(
  items: T[],
  keyFn: (item: T) => K
): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}
