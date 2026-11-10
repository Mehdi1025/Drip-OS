import { NextResponse } from "next/server";
import { fetchOverdueOrderCount } from "@/app/delais/actions";

export const dynamic = "force-dynamic";

export async function GET() {
  const count = await fetchOverdueOrderCount();
  return NextResponse.json({ count });
}
