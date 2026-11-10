"use server";

import { revalidatePath } from "next/cache";
import { chunkSkins } from "@/lib/imposition/group-skins";
import {
  formatLotId,
  lotIdPrefixForDate,
  nextSequenceFromLotIds,
} from "@/lib/imposition/lot-id";
import {
  buildImpositionTrackCode,
  buildTempImpositionTrackCode,
  extractOrderPrefix,
} from "@/lib/imposition/track-code";
import { isNonProductionCatalogTitle } from "@/lib/shopify/is-skin-line-item";
import type { PendingSkin } from "@/lib/imposition/types";
import {
  countDistinctOrders,
  decrementInventoryForLot,
} from "@/lib/inventory/decrement-for-lot";
import type { LotAwaitingFileRow } from "@/lib/lots/types";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export type GenerateLotResult =
  | {
      ok: true;
      lotId: string;
      sheets: number;
      skins: number;
      stockAlertsSent?: number;
      inventoryWarning?: string;
    }
  | { ok: false; error: string };

export async function fetchPendingSkins(): Promise<PendingSkin[]> {
  let supabase;
  try {
    supabase = createSupabaseAdmin();
  } catch (e) {
    console.error("[imposition] Supabase config", e);
    return [];
  }

  const { data, error } = await supabase
    .from("skins")
    .select(
      `
      id,
      design_name,
      track_code,
      reprint_of,
      order_id,
      orders (
        customer_name,
        id_shopify
      )
    `
    )
    .in("status", ["pending", "scrap"])
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[imposition] fetchPendingSkins", error);
    return [];
  }

  return (data ?? []).flatMap((row) => {
    const order = row.orders;
    const orderRecord = Array.isArray(order) ? order[0] : order;
    if (!orderRecord) return [];

    if (isNonProductionCatalogTitle(row.design_name)) {
      return [];
    }

    return [
      {
        id: row.id,
        design_name: row.design_name,
        track_code: row.track_code,
        reprint_of: row.reprint_of as string | null,
        order_id: row.order_id,
        customer_name: orderRecord.customer_name,
        id_shopify: orderRecord.id_shopify,
      },
    ];
  });
}

export async function generateLotFromPending(): Promise<GenerateLotResult> {
  const supabase = createSupabaseAdmin();
  const pending = await fetchPendingSkins();

  if (pending.length === 0) {
    return { ok: false, error: "Aucun skin en attente à imposer." };
  }

  const now = new Date();
  const prefix = lotIdPrefixForDate(now);

  const { data: todayLots, error: lotsError } = await supabase
    .from("lots")
    .select("id")
    .like("id", `${prefix}%`);

  if (lotsError) {
    console.error("[imposition] lots lookup", lotsError);
    return { ok: false, error: "Impossible de générer l'identifiant du lot." };
  }

  const lotId = formatLotId(
    now,
    nextSequenceFromLotIds(
      (todayLots ?? []).map((l) => l.id),
      prefix
    )
  );

  const { error: lotInsertError } = await supabase
    .from("lots")
    .insert({ id: lotId });

  if (lotInsertError) {
    console.error("[imposition] lot insert", lotInsertError);
    return { ok: false, error: "Échec de création du lot." };
  }

  const packs = chunkSkins(pending);
  let sheetCount = 0;
  let tempTrackSequence = Date.now() % 1_000_000;

  for (let sheetIndex = 0; sheetIndex < packs.length; sheetIndex++) {
    const pack = packs[sheetIndex];
    const sheetNumber = sheetIndex + 1;

    const { data: sheet, error: sheetError } = await supabase
      .from("sheets")
      .insert({
        lot_id: lotId,
        sheet_index: sheetNumber,
        status: "ready",
      })
      .select("id")
      .single();

    if (sheetError || !sheet) {
      console.error("[imposition] sheet insert", sheetError);
      return {
        ok: false,
        error: `Échec création feuille ${sheetNumber}. Lot ${lotId} partiel — vérifie Supabase.`,
      };
    }

    sheetCount++;

    for (let slot = 0; slot < pack.length; slot++) {
      const skin = pack[slot];
      tempTrackSequence += 1;
      const { error: tempError } = await supabase
        .from("skins")
        .update({ track_code: buildTempImpositionTrackCode(tempTrackSequence) })
        .eq("id", skin.id)
        .in("status", ["pending", "scrap"]);

      if (tempError) {
        console.error("[imposition] skin temp track_code", tempError);
        return {
          ok: false,
          error: `Échec préparation skin ${skin.design_name} (code traçabilité).`,
        };
      }
    }

    for (let slot = 0; slot < pack.length; slot++) {
      const skin = pack[slot];
      const slotNumber = slot + 1;
      const orderPrefix = extractOrderPrefix(skin.track_code, skin.id_shopify);
      const trackCode = buildImpositionTrackCode(
        orderPrefix,
        sheetNumber,
        slotNumber
      );

      const { error: skinUpdateError } = await supabase
        .from("skins")
        .update({
          sheet_id: sheet.id,
          slot: slotNumber,
          track_code: trackCode,
          status: "imposed",
        })
        .eq("id", skin.id)
        .in("status", ["pending", "scrap"]);

      if (skinUpdateError) {
        console.error("[imposition] skin update", skinUpdateError);
        const detail =
          skinUpdateError.code === "23505"
            ? " (code traçabilité déjà utilisé)"
            : "";
        return {
          ok: false,
          error: `Échec mise à jour skin ${skin.design_name}.${detail}`,
        };
      }
    }
  }

  const inventoryResult = await decrementInventoryForLot({
    sheetCount,
    distinctOrderCount: countDistinctOrders(pending.map((s) => s.order_id)),
  });

  revalidatePath("/imposition");
  revalidatePath("/inventory");
  revalidatePath("/stats");

  if (!inventoryResult.ok) {
    return {
      ok: true,
      lotId,
      sheets: sheetCount,
      skins: pending.length,
      inventoryWarning: inventoryResult.error,
    };
  }

  revalidatePath(`/lots/${lotId}`);

  return {
    ok: true,
    lotId,
    sheets: sheetCount,
    skins: pending.length,
    stockAlertsSent: inventoryResult.alertsSent,
  };
}

export async function fetchLotsAwaitingFiles(): Promise<{
  rows: LotAwaitingFileRow[];
  totalMissing: number;
}> {
  const supabase = createSupabaseAdmin();
  const { data: sheets, error } = await supabase
    .from("sheets")
    .select("id, lot_id, file_status, lots ( created_at )")
    .eq("file_status", "attente_fichier");

  if (error || !sheets?.length) {
    return { rows: [], totalMissing: 0 };
  }

  const byLot = new Map<
    string,
    { createdAt: string; missing: number; total: number }
  >();

  for (const sheet of sheets) {
    const lotId = sheet.lot_id;
    const lot = sheet.lots;
    const createdAt =
      lot && typeof lot === "object" && "created_at" in lot
        ? String((lot as { created_at: string }).created_at)
        : new Date().toISOString();
    const cur = byLot.get(lotId) ?? {
      createdAt,
      missing: 0,
      total: 0,
    };
    cur.missing += 1;
    cur.total += 1;
    byLot.set(lotId, cur);
  }

  const { data: allSheets } = await supabase
    .from("sheets")
    .select("lot_id")
    .in("lot_id", Array.from(byLot.keys()));

  const totalByLot = new Map<string, number>();
  for (const s of allSheets ?? []) {
    totalByLot.set(s.lot_id, (totalByLot.get(s.lot_id) ?? 0) + 1);
  }

  const now = Date.now();
  const rows: LotAwaitingFileRow[] = Array.from(byLot.entries()).map(
    ([lotId, v]) => ({
      lotId,
      createdAt: v.createdAt,
      missingSheets: v.missing,
      totalSheets: totalByLot.get(lotId) ?? v.total,
      ageHours: Math.round((now - new Date(v.createdAt).getTime()) / 3600000),
    })
  );

  rows.sort((a, b) => b.ageHours - a.ageHours);

  return {
    rows,
    totalMissing: sheets.length,
  };
}
