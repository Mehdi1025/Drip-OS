import { NextRequest, NextResponse } from "next/server";
import { requireLotApiAccess } from "@/lib/auth/api-guard";
import { assertLotIdParam } from "@/lib/lots/sheet-code";
import { resolveSheetByCode, uploadPlancheFiles } from "@/lib/lots/upload";

type RouteParams = { params: { lotId: string; sheetCode: string } };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = requireLotApiAccess(request.headers.get("authorization"));
  if (!auth.ok) return auth.response;

  const lotId = assertLotIdParam(params.lotId);
  if (!lotId) {
    return NextResponse.json({ error: "Lot invalide." }, { status: 400 });
  }

  const sheetCode = params.sheetCode.toUpperCase();
  const sheet = await resolveSheetByCode(lotId, sheetCode);
  if (!sheet) {
    return NextResponse.json({ error: "Feuille introuvable." }, { status: 404 });
  }

  try {
    const form = await request.formData();
    const pdfEntry = form.get("pdf");
    if (!(pdfEntry instanceof Blob)) {
      return NextResponse.json({ error: "PDF obligatoire." }, { status: 400 });
    }

    const pdfBuffer = Buffer.from(await pdfEntry.arrayBuffer());
    const pngEntry = form.get("png");
    let pngBuffer: Buffer | null = null;
    if (pngEntry instanceof Blob && pngEntry.size > 0) {
      pngBuffer = Buffer.from(await pngEntry.arrayBuffer());
    }

    await uploadPlancheFiles(lotId, sheet.id, pdfBuffer, pngBuffer);
    return NextResponse.json({ ok: true, sheet_code: sheetCode });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Échec upload.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
