"use server";

import { revalidatePath } from "next/cache";
import {
  buildLotExportRows,
  lotExportFilename,
  lotExportToCsv,
  recordLotExport,
} from "@/lib/lots/export";
import { insertLotEvent } from "@/lib/lots/events";
import {
  parseSheetCodeFromFilename,
  sheetCodeFromIndex,
} from "@/lib/lots/sheet-code";
import {
  createSignedPlancheUrl,
  resolveSheetByCode,
  uploadPlancheFiles,
} from "@/lib/lots/upload";
import { normalizeLotId, isValidLotId } from "@/lib/workshop/lot-pattern";
import type { LotDetailData } from "@/lib/lots/types";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export type LotActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function fetchLotDetail(
  rawLotId: string
): Promise<{ ok: true; data: LotDetailData } | { ok: false; error: string }> {
  const lotId = normalizeLotId(rawLotId);
  if (!isValidLotId(lotId)) {
    return { ok: false, error: "Format de lot invalide." };
  }

  const supabase = createSupabaseAdmin();

  const { data: lot, error: lotError } = await supabase
    .from("lots")
    .select("id, created_at, locked, export_version, exported_at")
    .eq("id", lotId)
    .maybeSingle();

  if (lotError || !lot) {
    return { ok: false, error: `Lot ${lotId} introuvable.` };
  }

  const { data: sheets, error: sheetsError } = await supabase
    .from("sheets")
    .select(
      "id, sheet_index, status, file_status, file_path, png_path, file_uploaded_at"
    )
    .eq("lot_id", lotId)
    .order("sheet_index", { ascending: true });

  if (sheetsError) {
    return { ok: false, error: "Impossible de charger les feuilles." };
  }

  const sheetIds = (sheets ?? []).map((s) => s.id);
  type SkinRow = {
    id: string;
    design_name: string;
    track_code: string;
    status: string;
    slot: number | null;
    sheet_id: string | null;
    alert: string | null;
    reprint_of: string | null;
    orders: { customer_name: string; id_shopify: number } | null;
  };

  const skinsBySheet = new Map<string, SkinRow[]>();

  if (sheetIds.length > 0) {
    const { data: skins, error: skinsError } = await supabase
      .from("skins")
      .select(
        `
        id, design_name, track_code, status, slot, sheet_id, alert, reprint_of,
        orders ( customer_name, id_shopify )
      `
      )
      .in("sheet_id", sheetIds);

    if (skinsError) {
      return { ok: false, error: "Impossible de charger les skins." };
    }

    for (const row of skins ?? []) {
      if (!row.sheet_id) continue;
      const list = skinsBySheet.get(row.sheet_id) ?? [];
      list.push(row as unknown as SkinRow);
      skinsBySheet.set(row.sheet_id, list);
    }
  }

  const detailSheets = (sheets ?? []).map((sheet) => {
    const code = sheetCodeFromIndex(sheet.sheet_index ?? 1);
    const skinList = skinsBySheet.get(sheet.id) ?? [];
    const slots: (LotDetailData["sheets"][0]["slots"][0])[] = [
      null,
      null,
      null,
      null,
    ];
    for (const skin of skinList) {
      if (skin.slot && skin.slot >= 1 && skin.slot <= 4) {
        const order = skin.orders;
        const orderRecord = Array.isArray(order) ? order[0] : order;
        slots[skin.slot - 1] = {
          id: skin.id,
          design_name: skin.design_name,
          track_code: skin.track_code,
          status: skin.status,
          alert: skin.alert,
          reprint_of: skin.reprint_of,
          customer_name: orderRecord?.customer_name ?? "—",
          id_shopify: orderRecord?.id_shopify ?? 0,
        };
      }
    }

    return {
      id: sheet.id,
      sheetCode: code,
      sheetIndex: sheet.sheet_index ?? 1,
      fileStatus: sheet.file_status ?? "attente_fichier",
      filePath: sheet.file_path,
      pngPath: sheet.png_path,
      fileUploadedAt: sheet.file_uploaded_at,
      slots,
    };
  });

  return {
    ok: true,
    data: {
      lotId: lot.id,
      createdAt: lot.created_at,
      locked: Boolean(lot.locked),
      exportVersion: lot.export_version ?? 0,
      exportedAt: lot.exported_at,
      sheets: detailSheets,
    },
  };
}

export async function exportLotFromUi(
  lotId: string,
  format: "csv" | "json"
): Promise<
  | { ok: true; content: string; filename: string; mime: string }
  | { ok: false; error: string }
> {
  try {
    const { rows } = await buildLotExportRows(lotId);
    const version = await recordLotExport(lotId);
    const filename = lotExportFilename(lotId, version, format);
    revalidatePath(`/lots/${lotId}`);
    revalidatePath("/imposition");

    if (format === "json") {
      return {
        ok: true,
        content: JSON.stringify(rows, null, 2),
        filename,
        mime: "application/json",
      };
    }

    return {
      ok: true,
      content: lotExportToCsv(rows),
      filename,
      mime: "text/csv;charset=utf-8",
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Export impossible.",
    };
  }
}

export async function bulkUploadPlanches(
  lotId: string,
  files: { name: string; data: Uint8Array }[]
): Promise<
  | { ok: true; uploaded: number; rejected: string[] }
  | { ok: false; error: string }
> {
  const rejected: string[] = [];
  let uploaded = 0;

  for (const file of files) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      rejected.push(`${file.name} : PDF requis`);
      continue;
    }
    const sheetCode = parseSheetCodeFromFilename(file.name, lotId);
    if (!sheetCode) {
      rejected.push(`${file.name} : feuille non reconnue`);
      continue;
    }
    const sheet = await resolveSheetByCode(lotId, sheetCode);
    if (!sheet) {
      rejected.push(`${file.name} : feuille absente du lot`);
      continue;
    }
    try {
      await uploadPlancheFiles(lotId, sheet.id, Buffer.from(file.data), null);
      uploaded += 1;
    } catch (e) {
      rejected.push(
        `${file.name} : ${e instanceof Error ? e.message : "erreur"}`
      );
    }
  }

  revalidatePath(`/lots/${lotId}`);
  revalidatePath("/imposition");
  revalidatePath("/stats");

  if (uploaded === 0) {
    return { ok: false, error: rejected.join(" · ") || "Aucun fichier." };
  }

  return { ok: true, uploaded, rejected };
}

export async function markSheetPrintedAction(
  lotId: string,
  sheetId: string
): Promise<LotActionResult> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.rpc("mark_sheet_printed", {
    p_sheet_id: sheetId,
  });

  if (error) {
    if (error.message.includes("missing_file")) {
      return { ok: false, error: "Dépose d'abord le PDF de la planche." };
    }
    return { ok: false, error: "Échec marquage imprimée." };
  }

  revalidatePath(`/lots/${lotId}`);
  revalidatePath("/workshop");
  revalidatePath("/stats");
  return { ok: true };
}

export async function markAllSheetsPrintedAction(
  lotId: string
): Promise<LotActionResult> {
  const supabase = createSupabaseAdmin();
  const { data: sheets } = await supabase
    .from("sheets")
    .select("id, file_path, file_status")
    .eq("lot_id", lotId)
    .eq("file_status", "planche_prete");

  for (const sheet of sheets ?? []) {
    if (!sheet.file_path) continue;
  }

  for (const sheet of sheets ?? []) {
    if (!sheet.file_path) continue;
    const { error } = await supabase.rpc("mark_sheet_printed", {
      p_sheet_id: sheet.id,
    });
    if (error) {
      return { ok: false, error: "Échec sur une feuille." };
    }
  }

  revalidatePath(`/lots/${lotId}`);
  revalidatePath("/workshop");
  return { ok: true };
}

export async function getSignedFileUrl(
  lotId: string,
  sheetCode: string,
  type: "pdf" | "png"
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const sheet = await resolveSheetByCode(lotId, sheetCode);
  if (!sheet) return { ok: false, error: "Feuille introuvable." };

  const supabase = createSupabaseAdmin();
  const { data: row } = await supabase
    .from("sheets")
    .select("file_path, png_path")
    .eq("id", sheet.id)
    .single();

  const path =
    type === "png" ? row?.png_path ?? row?.file_path : row?.file_path;
  if (!path) return { ok: false, error: "Aucun fichier." };

  try {
    const url = await createSignedPlancheUrl(path);
    return { ok: true, url };
  } catch {
    return { ok: false, error: "URL indisponible." };
  }
}

export async function removeCancelledSkinFromSheet(
  lotId: string,
  skinId: string
): Promise<LotActionResult> {
  const supabase = createSupabaseAdmin();

  const { data: skin, error: readError } = await supabase
    .from("skins")
    .select("id, sheet_id, alert")
    .eq("id", skinId)
    .maybeSingle();

  if (readError || !skin?.sheet_id) {
    return { ok: false, error: "Skin introuvable." };
  }

  if (skin.alert !== "commande_annulee") {
    return { ok: false, error: "Pas d'alerte annulation sur ce skin." };
  }

  const sheetId = skin.sheet_id;

  const { error: scrapError } = await supabase
    .from("skins")
    .update({
      status: "scrap",
      scrap_reason: "annulation",
      sheet_id: null,
      slot: null,
      alert: null,
    })
    .eq("id", skinId);

  if (scrapError) {
    return { ok: false, error: "Échec retrait." };
  }

  await supabase.rpc("reset_sheet_after_slot_removal", {
    p_sheet_id: sheetId,
  });

  const sheet = await supabase
    .from("sheets")
    .select("sheet_index")
    .eq("id", sheetId)
    .single();

  await insertLotEvent(lotId, "alert", {
    action: "removed_cancelled_skin",
    skin_id: skinId,
    sheet_code: sheetCodeFromIndex(sheet.data?.sheet_index ?? 1),
  });

  revalidatePath(`/lots/${lotId}`);
  revalidatePath("/imposition");
  return { ok: true };
}
