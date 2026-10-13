export type ShopifyAdminConfig = {
  shop: string;
  accessToken: string;
  apiVersion: string;
};

/** Domaine type `boutique.myshopify.com` (sans https). */
export function getShopifyAdminConfig(): ShopifyAdminConfig | null {
  const rawDomain = process.env.SHOPIFY_STORE_DOMAIN?.trim();
  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim();
  if (!rawDomain || !accessToken) return null;

  const shop = rawDomain
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .toLowerCase();

  const apiVersion =
    process.env.SHOPIFY_API_VERSION?.trim() || "2024-10";

  return { shop, accessToken, apiVersion };
}

export function isShopifyAdminConfigured(): boolean {
  return getShopifyAdminConfig() !== null;
}
