import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createSupabaseAdmin();
    const { error } = await supabase.from("orders").select("id").limit(1);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          connected: false,
          error: error.message,
          hint:
            error.code === "42P01"
              ? "Exécute supabase/migrations/001_drip_os_init.sql dans le SQL Editor Supabase."
              : undefined,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      connected: true,
      project: process.env.NEXT_PUBLIC_SUPABASE_URL,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { ok: false, connected: false, error: message },
      { status: 500 }
    );
  }
}
