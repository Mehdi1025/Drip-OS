"use server";

import { revalidatePath } from "next/cache";
import { isValidLotId, normalizeLotId } from "@/lib/workshop/lot-pattern";
import type { ScrapReasonValue } from "@/lib/workshop/scrap-reasons";
import { isScrapReason } from "@/lib/workshop/scrap-reasons";
import type {
  RecentWorkshopLot,
  WorkshopLotData,
  WorkshopSheet,
  WorkshopSkin,
} from "@/lib/workshop/types";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const ACTIVE_WORKSHOP_STATUSES = ["imposed", "printed"] as const;

export type FetchLotResult =
  | { ok: true; data: WorkshopLotData }
  | { ok: false; error: string };

export type SkinActionResult = { ok: true } | { ok: false; error: string };

const RECENT_LOT_LIMIT = 10;

/** Derniers lots créés (Imposition), avec nombre de skins encore à contrôler. */
export async function fetchRecentWorkshopLots(): Promise<RecentWorkshopLot[]> {
  try {
    const supabase = createSupabaseAdmin();

    const { data: lots, error: lotsError } = await supabase
      .from("lots")
      .select("id, created_at")
      .order("created_at", { ascending: false })
      .limit(RECENT_LOT_LIMIT);

    if (lotsError || !lots?.length) {
      if (lotsError) console.error("[workshop] recent lots", lotsError);
      return [];
    }

    const lotIds = lots.map((l) => l.id);

    const { data: sheets, error: sheetsError } = await supabase
      .from("sheets")
      .select("id, lot_id")
      .in("lot_id", lotIds);

    if (sheetsError || !sheets?.length) {
      return lots.map((l) => ({
        lotId: l.id,
        createdAt: l.created_at,
        pendingControl: 0,
      }));
    }

    const sheetIds = sheets.map((s) => s.id);
    const lotBySheet = new Map(sheets.map((s) => [s.id, s.lot_id]));

    const { data: skins, error: skinsError } = await supabase
      .from("skins")
      .select("sheet_id, status")
      .in("sheet_id", sheetIds)
      .in("status", [...ACTIVE_WORKSHOP_STATUSES]);

    if (skinsError) {
      console.error("[workshop] recent lots skins", skinsError);
      return lots.map((l) => ({
        lotId: l.id,
        createdAt: l.created_at,
        pendingControl: 0,
      }));
    }

    const pendingByLot = new Map<string, number>();
    for (const skin of skins ?? []) {
      if (!skin.sheet_id) continue;
      const lotId = lotBySheet.get(skin.sheet_id);
      if (!lotId) continue;
      pendingByLot.set(lotId, (pendingByLot.get(lotId) ?? 0) + 1);
    }

    return lots.map((l) => ({
      lotId: l.id,
      createdAt: l.created_at,
      pendingControl: pendingByLot.get(l.id) ?? 0,
    }));
  } catch (e) {
    console.error("[workshop] fetchRecentWorkshopLots", e);
    return [];
  }
}

function buildSheetSlots(skins: WorkshopSkin[]): (WorkshopSkin | null)[] {
  const slots: (WorkshopSkin | null)[] = [null, null, null, null];
  for (const skin of skins) {
    if (skin.slot && skin.slot >= 1 && skin.slot <= 4) {
      slots[skin.slot - 1] = skin;
    }
  }
  return slots;
}

export async function fetchLotWorkshop(rawLotId: string): Promise<FetchLotResult> {
  const lotId = normalizeLotId(rawLotId);

  if (!isValidLotId(lotId)) {
    return {
      ok: false,
      error: "Format invalide. Exemple : L-261013-01",
    };
  }

  const supabase = createSupabaseAdmin();

  const { data: lot, error: lotError } = await supabase
    .from("lots")
    .select("id")
    .eq("id", lotId)
    .maybeSingle();

  if (lotError) {
    console.error("[workshop] lot lookup", lotError);
    return { ok: false, error: "Erreur lors de la recherche du lot." };
  }

  if (!lot) {
    return { ok: false, error: `Lot ${lotId} introuvable.` };
  }

  const { data: sheets, error: sheetsError } = await supabase
    .from("sheets")
    .select("id, sheet_index, status")
    .eq("lot_id", lotId)
    .order("sheet_index", { ascending: true });

  if (sheetsError) {
    console.error("[workshop] sheets fetch", sheetsError);
    return { ok: false, error: "Impossible de charger les feuilles." };
  }

  if (!sheets?.length) {
    return {
      ok: true,
      data: { lotId, sheets: [] },
    };
  }

  const sheetIds = sheets.map((s) => s.id);

  const { data: skins, error: skinsError } = await supabase
    .from("skins")
    .select(
      `
      id,
      design_name,
      track_code,
      status,
      slot,
      sheet_id,
      orders ( customer_name )
    `
    )
    .in("sheet_id", sheetIds)
    .in("status", [...ACTIVE_WORKSHOP_STATUSES]);

  if (skinsError) {
    console.error("[workshop] skins fetch", skinsError);
    return { ok: false, error: "Impossible de charger les skins." };
  }

  const skinsBySheet = new Map<string, WorkshopSkin[]>();

  for (const row of skins ?? []) {
    if (!row.sheet_id) continue;
    const order = row.orders;
    const orderRecord = Array.isArray(order) ? order[0] : order;
    const skin: WorkshopSkin = {
      id: row.id,
      design_name: row.design_name,
      track_code: row.track_code,
      status: row.status,
      slot: row.slot,
      customer_name: orderRecord?.customer_name ?? "—",
    };
    const list = skinsBySheet.get(row.sheet_id) ?? [];
    list.push(skin);
    skinsBySheet.set(row.sheet_id, list);
  }

  const workshopSheets: WorkshopSheet[] = sheets.map((sheet) => ({
    id: sheet.id,
    sheetIndex: sheet.sheet_index ?? 1,
    status: sheet.status,
    slots: buildSheetSlots(skinsBySheet.get(sheet.id) ?? []),
  }));

  return {
    ok: true,
    data: { lotId, sheets: workshopSheets },
  };
}

export async function markSkinCut(skinId: string): Promise<SkinActionResult> {
  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from("skins")
    .update({ status: "cut" })
    .eq("id", skinId)
    .in("status", [...ACTIVE_WORKSHOP_STATUSES]);

  if (error) {
    console.error("[workshop] markSkinCut", error);
    return { ok: false, error: "Échec mise à jour (Contrôle OK)." };
  }

  revalidatePath("/workshop");
  revalidatePath("/imposition");
  return { ok: true };
}

export async function markSkinScrap(
  skinId: string,
  reason: ScrapReasonValue
): Promise<SkinActionResult> {
  if (!isScrapReason(reason)) {
    return { ok: false, error: "Cause de rebut invalide." };
  }

  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from("skins")
    .update({
      status: "scrap",
      scrap_reason: reason,
      sheet_id: null,
      slot: null,
    })
    .eq("id", skinId)
    .in("status", [...ACTIVE_WORKSHOP_STATUSES]);

  if (error) {
    console.error("[workshop] markSkinScrap", error);
    return { ok: false, error: "Échec enregistrement du rebut." };
  }

  revalidatePath("/workshop");
  revalidatePath("/imposition");
  return { ok: true };
}
