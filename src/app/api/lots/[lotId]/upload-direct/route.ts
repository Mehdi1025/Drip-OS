import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireLotApiAccess } from "@/lib/auth/api-guard";
import {
  assertLotIdParam,
  parseSheetCodeFromFilename,
  storageObjectPath,
} from "@/lib/lots/sheet-code";
import {
  createSignedPlancheUploadUrl,
  finalizePlancheUpload,
  resolveSheetByCode,
} from "@/lib/lots/upload";

type RouteParams = { params: { lotId: string } };

const initBody = z.object({
  filename: z.string().min(1),
});

const completeBody = z.object({
  filename: z.string().min(1),
  path: z.string().min(1),
});

function sheetFromFilename(lotId: string, filename: string) {
  const sheetCode = parseSheetCodeFromFilename(filename, lotId);
  if (!sheetCode) {
    return { error: `${filename} : feuille non reconnue (F1.pdf, ${lotId}_F1.pdf…)` };
  }
  return { sheetCode };
}

/** Demande une URL signée ; le navigateur envoie le PDF directement à Supabase. */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = requireLotApiAccess(request.headers.get("authorization"));
  if (!auth.ok) return auth.response;

  const lotId = assertLotIdParam(params.lotId);
  if (!lotId) {
    return NextResponse.json({ error: "Lot invalide." }, { status: 400 });
  }

  let body: z.infer<typeof initBody>;
  try {
    body = initBody.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  const parsed = sheetFromFilename(lotId, body.filename);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const sheet = await resolveSheetByCode(lotId, parsed.sheetCode);
  if (!sheet) {
    return NextResponse.json(
      { error: `${body.filename} : ${parsed.sheetCode} absente du lot` },
      { status: 400 }
    );
  }

  const pdfPath = storageObjectPath(lotId, parsed.sheetCode, "pdf");

  try {
    const creds = await createSignedPlancheUploadUrl(pdfPath);
    return NextResponse.json({
      ok: true,
      sheetCode: parsed.sheetCode,
      path: creds.path,
      token: creds.token,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Init upload impossible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Après upload Storage : met à jour la feuille (RPC). */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = requireLotApiAccess(request.headers.get("authorization"));
  if (!auth.ok) return auth.response;

  const lotId = assertLotIdParam(params.lotId);
  if (!lotId) {
    return NextResponse.json({ error: "Lot invalide." }, { status: 400 });
  }

  let body: z.infer<typeof completeBody>;
  try {
    body = completeBody.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  const parsed = sheetFromFilename(lotId, body.filename);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const expectedPath = storageObjectPath(lotId, parsed.sheetCode, "pdf");
  if (body.path !== expectedPath) {
    return NextResponse.json({ error: "Chemin fichier invalide." }, { status: 400 });
  }

  const sheet = await resolveSheetByCode(lotId, parsed.sheetCode);
  if (!sheet) {
    return NextResponse.json(
      { error: `${parsed.sheetCode} absente du lot` },
      { status: 400 }
    );
  }

  try {
    await finalizePlancheUpload(lotId, sheet.id, parsed.sheetCode, expectedPath, null);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Finalisation impossible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
