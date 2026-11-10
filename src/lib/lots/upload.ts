import { insertLotEvent } from "@/lib/lots/events";
import { sheetCodeFromIndex, storageObjectPath } from "@/lib/lots/sheet-code";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const MAX_BYTES = 50 * 1024 * 1024;

export async function resolveSheetByCode(
  lotId: string,
  sheetCode: string
): Promise<{ id: string; sheet_index: number } | null> {
  const match = sheetCode.match(/^F(\d+)$/i);
  if (!match) return null;
  const index = Number(match[1]);
  if (!Number.isFinite(index) || index < 1) return null;

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("sheets")
    .select("id, sheet_index")
    .eq("lot_id", lotId)
    .eq("sheet_index", index)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function uploadPlancheFiles(
  lotId: string,
  sheetId: string,
  pdf: Buffer,
  png?: Buffer | null
): Promise<void> {
  if (pdf.length > MAX_BYTES) {
    throw new Error("PDF trop volumineux (max 50 Mo).");
  }
  if (png && png.length > MAX_BYTES) {
    throw new Error("PNG trop volumineux (max 50 Mo).");
  }

  const supabase = createSupabaseAdmin();

  const { data: sheet, error: sheetError } = await supabase
    .from("sheets")
    .select("id, sheet_index, lot_id")
    .eq("id", sheetId)
    .eq("lot_id", lotId)
    .maybeSingle();

  if (sheetError || !sheet) {
    throw new Error("Feuille introuvable.");
  }

  const sheetCode = sheetCodeFromIndex(sheet.sheet_index ?? 1);
  const pdfPath = storageObjectPath(lotId, sheetCode, "pdf");

  const { error: pdfError } = await supabase.storage
    .from("planches")
    .upload(pdfPath, pdf, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (pdfError) {
    console.error("[upload] pdf", pdfError);
    throw new Error("Échec upload PDF.");
  }

  let pngPath: string | null = null;
  if (png && png.length > 0) {
    pngPath = storageObjectPath(lotId, sheetCode, "png");
    const { error: pngError } = await supabase.storage
      .from("planches")
      .upload(pngPath, png, {
        contentType: "image/png",
        upsert: true,
      });
    if (pngError) {
      console.error("[upload] png", pngError);
      throw new Error("Échec upload PNG.");
    }
  }

  const { error: rpcError } = await supabase.rpc("upload_planche_sheet", {
    p_sheet_id: sheetId,
    p_file_path: pdfPath,
    p_png_path: pngPath,
  });

  if (rpcError) {
    console.error("[upload] rpc", rpcError);
    throw new Error("Échec mise à jour feuille.");
  }

  await insertLotEvent(lotId, "upload", {
    sheet_id: sheetId,
    sheet_code: sheetCode,
    pdf_path: pdfPath,
    png_path: pngPath,
  });
}

export async function createSignedPlancheUrl(
  filePath: string,
  expiresIn = 600
): Promise<string> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from("planches")
    .createSignedUrl(filePath, expiresIn);

  if (error || !data?.signedUrl) {
    throw new Error("URL signée indisponible.");
  }
  return data.signedUrl;
}
