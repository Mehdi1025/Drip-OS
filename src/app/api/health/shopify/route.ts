import { NextResponse } from "next/server";
import { shopifyAdminFetch } from "@/lib/shopify/admin-fetch";
import { isShopifyAdminConfigured } from "@/lib/shopify/admin-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Vérifie que le token Admin Shopify répond (sans exposer de secret). */
export async function GET() {
  if (!isShopifyAdminConfigured()) {
    return NextResponse.json({
      ok: false,
      configured: false,
      error: "SHOPIFY_STORE_DOMAIN ou SHOPIFY_ADMIN_ACCESS_TOKEN manquant",
    });
  }

  try {
    const res = await shopifyAdminFetch("/shop.json");
    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        configured: true,
        status: res.status,
        error: text.slice(0, 200),
      });
    }
    return NextResponse.json({ ok: true, configured: true, status: res.status });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Shopify health check failed";
    return NextResponse.json({ ok: false, configured: true, error: message });
  }
}
