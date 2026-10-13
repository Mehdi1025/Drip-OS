import type { ShopifyLineItem } from "@/lib/shopify/types";

function propertyValue(
  item: ShopifyLineItem,
  name: string
): string | undefined {
  const match = item.properties?.find(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  );
  const value = match?.value?.trim();
  return value || undefined;
}

/**
 * Detects a "Skin" line item from common Shopify conventions.
 * Adjust matchers to match your catalog (product_type, tags via metafields, SKU, etc.).
 */
export function isSkinLineItem(item: ShopifyLineItem): boolean {
  const typeProp = propertyValue(item, "type") ?? propertyValue(item, "_type");
  if (typeProp?.toLowerCase() === "skin") {
    return true;
  }

  const productType = item.product_type?.trim().toLowerCase();
  if (productType === "skin") {
    return true;
  }

  const sku = item.sku?.trim().toUpperCase() ?? "";
  if (sku.startsWith("SKIN-") || sku.startsWith("SKIN_")) {
    return true;
  }

  const title = item.title.trim().toLowerCase();
  if (title === "skin" || title.includes(" skin")) {
    return true;
  }

  return false;
}
