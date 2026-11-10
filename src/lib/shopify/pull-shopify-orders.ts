import { shopifyAdminFetch } from "@/lib/shopify/admin-fetch";
import { isShopifyAdminConfigured } from "@/lib/shopify/admin-config";
import {
  importShopifyOrderFromRawBody,
  type ImportShopifyOrderResult,
} from "@/lib/shopify/import-shopify-order";

export type PullShopifyOrdersResult = {
  ok: true;
  ordersListed: number;
  ordersImported: number;
  skinsCreated: number;
  results: ImportShopifyOrderResult[];
  errors: string[];
};

/** Extrait les IDs commande depuis la réponse JSON brute (grands IDs Shopify). */
function extractOrderIdsFromListBody(rawBody: string): string[] {
  const ids: string[] = [];
  const re = /"admin_graphql_api_id"\s*:\s*"gid:\/\/shopify\/Order\/(\d+)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(rawBody)) !== null) {
    ids.push(match[1]);
  }

  if (ids.length > 0) return ids;

  const fallback = /"id"\s*:\s*(\d{10,})/g;
  while ((match = fallback.exec(rawBody)) !== null) {
    ids.push(match[1]);
  }

  return Array.from(new Set(ids));
}

export type PullShopifyOrdersOptions = {
  /** Nombre max de commandes listées (1–250, défaut 50). */
  limit?: number;
  /** Statut Shopify : any | open | closed (défaut any). */
  status?: "any" | "open" | "closed";
};

/**
 * Liste les commandes sur la boutique et les importe dans Supabase
 * (équivalent orders/create pour l'historique récent).
 */
export async function pullShopifyOrders(
  options: PullShopifyOrdersOptions = {}
): Promise<PullShopifyOrdersResult | { ok: false; error: string }> {
  if (!isShopifyAdminConfigured()) {
    return { ok: false, error: "Shopify Admin API non configurée" };
  }

  const limit = Math.min(250, Math.max(1, options.limit ?? 50));
  const status = options.status ?? "any";

  const listPath =
    `/orders.json?status=${encodeURIComponent(status)}` +
    `&limit=${limit}&order=created_at+desc` +
    `&fields=id,admin_graphql_api_id`;

  let listRaw: string;
  try {
    const res = await shopifyAdminFetch(listPath);
    listRaw = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        error: `Shopify list orders: HTTP ${res.status} ${listRaw.slice(0, 200)}`,
      };
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur réseau Shopify";
    return { ok: false, error: message };
  }

  const orderIds = extractOrderIdsFromListBody(listRaw);
  const results: ImportShopifyOrderResult[] = [];
  const errors: string[] = [];
  let ordersImported = 0;
  let skinsCreated = 0;

  for (const idShopify of orderIds) {
    let orderRaw: string;
    try {
      const res = await shopifyAdminFetch(`/orders/${idShopify}.json`);
      orderRaw = await res.text();
      if (!res.ok) {
        errors.push(`#${idShopify}: HTTP ${res.status}`);
        continue;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "fetch failed";
      errors.push(`#${idShopify}: ${message}`);
      continue;
    }

    const result = await importShopifyOrderFromRawBody(orderRaw);
    results.push(result);

    if (result.ok) {
      ordersImported += 1;
      skinsCreated += result.skins_created;
    } else {
      errors.push(`#${idShopify}: ${result.error}`);
    }
  }

  return {
    ok: true,
    ordersListed: orderIds.length,
    ordersImported,
    skinsCreated,
    results,
    errors,
  };
}
