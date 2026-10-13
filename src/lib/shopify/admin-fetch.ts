import { getShopifyAdminConfig } from "@/lib/shopify/admin-config";

export class ShopifyAdminError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: string
  ) {
    super(message);
    this.name = "ShopifyAdminError";
  }
}

export async function shopifyAdminFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const config = getShopifyAdminConfig();
  if (!config) {
    throw new ShopifyAdminError("Shopify Admin API not configured", 0);
  }

  const url = `https://${config.shop}/admin/api/${config.apiVersion}${path}`;

  return fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      "X-Shopify-Access-Token": config.accessToken,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...init?.headers,
    },
  });
}

export async function shopifyAdminJson<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await shopifyAdminFetch(path, init);
  const text = await res.text();

  if (!res.ok) {
    throw new ShopifyAdminError(
      `Shopify API ${res.status}`,
      res.status,
      text.slice(0, 2000)
    );
  }

  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ShopifyAdminError("Invalid JSON from Shopify", res.status, text);
  }
}
