import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireLotApiAccess } from "@/lib/auth/api-guard";
import { assertLotIdParam } from "@/lib/lots/sheet-code";
import { createSignedPlancheUrl } from "@/lib/lots/upload";
import { resolveSheetByCode } from "@/lib/lots/upload";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const querySchema = z.object({
  type: z.enum(["pdf", "png"]).default("pdf"),
});

type RouteParams = { params: { lotId: string; sheetCode: string } };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = requireLotApiAccess(request.headers.get("authorization"));
  if (!auth.ok) return auth.response;

  const lotId = assertLotIdParam(params.lotId);
  if (!lotId) {
    return NextResponse.json({ error: "Lot invalide." }, { status: 400 });
  }

  const parsed = querySchema.safeParse({
    type: request.nextUrl.searchParams.get("type") ?? "pdf",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Type invalide." }, { status: 400 });
  }

  const sheet = await resolveSheetByCode(lotId, params.sheetCode.toUpperCase());
  if (!sheet) {
    return NextResponse.json({ error: "Feuille introuvable." }, { status: 404 });
  }

  const supabase = createSupabaseAdmin();
  const { data: row, error } = await supabase
    .from("sheets")
    .select("file_path, png_path")
    .eq("id", sheet.id)
    .single();

  if (error || !row) {
    return NextResponse.json({ error: "Feuille introuvable." }, { status: 404 });
  }

  const path =
    parsed.data.type === "png" ? row.png_path ?? row.file_path : row.file_path;

  if (!path) {
    return NextResponse.json({ error: "Aucun fichier déposé." }, { status: 404 });
  }

  try {
    const url = await createSignedPlancheUrl(path, 600);
    return NextResponse.json({ url, expires_in: 600 });
  } catch {
    return NextResponse.json({ error: "URL signée indisponible." }, { status: 500 });
  }
}
