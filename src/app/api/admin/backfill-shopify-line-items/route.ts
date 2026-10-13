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

export async function POST(request: NextRequest) {
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

  let body: { orderShopifyId?: string; all?: boolean } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  if (body.orderShopifyId?.trim()) {
    const result = await backfillFromShopifyAdminForOrder(
      body.orderShopifyId.trim()
    );
    return NextResponse.json({ ok: !result.error, ...result });
  }

  if (body.all) {
    const result = await backfillAllOrdersMissingLineItems();
    return NextResponse.json(result);
  }

  return NextResponse.json(
    {
      ok: false,
      error: 'Body: { "orderShopifyId": "..." } ou { "all": true }',
    },
    { status: 400 }
  );
}
