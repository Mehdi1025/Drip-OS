import { NextRequest, NextResponse } from "next/server";
import { pullShopifyOrders } from "@/lib/shopify/pull-shopify-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

function parseLimit(raw: string | null): number | undefined {
  if (!raw?.trim()) return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : undefined;
}

async function handlePull(request: NextRequest) {
  const secret = process.env.DRIP_ADMIN_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      {
        ok: false,
        error: "DRIP_ADMIN_SECRET non configuré sur Vercel",
      },
      { status: 500 }
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return unauthorized();
  }

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get("limit"));
  const statusParam = url.searchParams.get("status")?.trim();
  const status =
    statusParam === "open" || statusParam === "closed" || statusParam === "any"
      ? statusParam
      : undefined;

  const result = await pullShopifyOrders({ limit, status });
  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  return handlePull(request);
}

/** Pratique sous PowerShell : GET avec ?limit=50 */
export async function GET(request: NextRequest) {
  return handlePull(request);
}
