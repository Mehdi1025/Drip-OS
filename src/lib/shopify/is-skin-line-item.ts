import type { ShopifyLineItem } from "@/lib/shopify/types";

/** Produits Shopify à ne jamais imprimer (assurance, garantie, etc.). */
const NON_PRODUCTION_TITLE_PATTERNS: RegExp[] = [
  /protection plan/i,
  /lens protection/i,
  /extended warranty/i,
  /warranty/i,
  /shipping protection/i,
  /route protection/i,
  /gift card/i,
  /^tip$/i,
  /donation/i,
];

export function isNonProductionCatalogTitle(title: string): boolean {
  const trimmed = title.trim();
  if (!trimmed) return false;
  return NON_PRODUCTION_TITLE_PATTERNS.some((re) => re.test(trimmed));
}

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
  if (isNonProductionCatalogTitle(item.title)) {
    return false;
  }

  if (process.env.SHOPIFY_IMPORT_ALL_LINE_ITEMS === "true") {
    return true;
  }

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
  if (
    title === "skin" ||
    title.includes(" skin") ||
    title.includes("card") ||
    title.includes("drip") ||
    title.includes("vinyle") ||
    title.includes("skin card")
  ) {
    return true;
  }

  return false;
}
