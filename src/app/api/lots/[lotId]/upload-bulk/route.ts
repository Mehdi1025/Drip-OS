import { NextRequest, NextResponse } from "next/server";
import { requireLotApiAccess } from "@/lib/auth/api-guard";
import { parseSheetCodeFromFilename } from "@/lib/lots/sheet-code";
import { assertLotIdParam } from "@/lib/lots/sheet-code";
import { resolveSheetByCode, uploadPlancheFiles } from "@/lib/lots/upload";

type RouteParams = { params: { lotId: string } };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = requireLotApiAccess(request.headers.get("authorization"));
  if (!auth.ok) return auth.response;

  const lotId = assertLotIdParam(params.lotId);
  if (!lotId) {
    return NextResponse.json({ error: "Lot invalide." }, { status: 400 });
  }

  try {
    const form = await request.formData();
    const rejected: string[] = [];
    let uploaded = 0;

    for (const [, value] of Array.from(form.entries())) {
      if (!(value instanceof Blob)) continue;
      const name =
        value instanceof File && value.name
          ? value.name
          : "upload.pdf";

      const sheetCode = parseSheetCodeFromFilename(name, lotId);
      if (!sheetCode) {
        rejected.push(`${name} : feuille non reconnue`);
        continue;
      }

      const sheet = await resolveSheetByCode(lotId, sheetCode);
      if (!sheet) {
        rejected.push(`${name} : ${sheetCode} absente du lot`);
        continue;
      }

      const buffer = Buffer.from(await value.arrayBuffer());
      const isPdf =
        name.toLowerCase().endsWith(".pdf") ||
        value.type === "application/pdf";
      if (!isPdf) {
        rejected.push(`${name} : PDF requis par fichier`);
        continue;
      }

      await uploadPlancheFiles(lotId, sheet.id, buffer, null);
      uploaded += 1;
    }

    if (uploaded === 0 && rejected.length > 0) {
      return NextResponse.json(
        { error: "Aucun fichier accepté.", rejected },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, uploaded, rejected });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Échec dépôt groupé.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
