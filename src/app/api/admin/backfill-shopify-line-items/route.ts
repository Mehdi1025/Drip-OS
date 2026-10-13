import { NextRequest, NextResponse } from "next/server";
import {
  backfillAllOrdersMissingLineItems,
  backfillFromShopifyAdminForOrder,
} from "@/lib/shopify/backfill-line-items";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

function isTruthyAll(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

async function parseBackfillRequest(request: NextRequest): Promise<{
  orderShopifyId?: string;
  all?: boolean;
}> {
  const url = new URL(request.url);
  if (isTruthyAll(url.searchParams.get("all"))) {
    return { all: true };
  }

  const orderFromQuery = url.searchParams.get("orderShopifyId")?.trim();
  if (orderFromQuery) {
    return { orderShopifyId: orderFromQuery };
  }

  const raw = await request.text();
  if (!raw.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as {
      orderShopifyId?: string;
      all?: boolean | string | number;
    };
    return {
      orderShopifyId: parsed.orderShopifyId?.trim(),
      all: isTruthyAll(parsed.all),
    };
  } catch {
    const normalized = raw.replace(/\s/g, "").toLowerCase();
    if (normalized.includes('"all":true') || normalized === "{all:true}") {
      return { all: true };
    }
    return {};
  }
}

async function handleBackfill(request: NextRequest) {
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

  const body = await parseBackfillRequest(request);

  if (body.orderShopifyId) {
    const result = await backfillFromShopifyAdminForOrder(body.orderShopifyId);
    return NextResponse.json({ ok: !result.error, ...result });
  }

  if (body.all) {
    const result = await backfillAllOrdersMissingLineItems();
    return NextResponse.json(result);
  }

  return NextResponse.json(
    {
      ok: false,
      error:
        'Utilise ?all=true, ou body JSON {"all":true}, ou {"orderShopifyId":"..."}',
    },
    { status: 400 }
  );
}

export async function POST(request: NextRequest) {
  return handleBackfill(request);
}

/** Pratique sous PowerShell : POST sans body JSON. */
export async function GET(request: NextRequest) {
  return handleBackfill(request);
}
