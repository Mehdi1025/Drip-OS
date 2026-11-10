import { insertLotEvent } from "@/lib/lots/events";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type SkinRow = {
  id: string;
  status: string;
  sheet_id: string | null;
  sheets: {
    lot_id: string;
    lots: { locked: boolean } | { locked: boolean }[] | null;
  } | null;
};

function isLotLocked(skin: SkinRow): boolean {
  const sheets = skin.sheets;
  if (!sheets) return false;
  const lots = sheets.lots;
  if (!lots) return false;
  const lot = Array.isArray(lots) ? lots[0] : lots;
  return Boolean(lot?.locked);
}

export async function handleShopifyOrderCancelled(
  orderUuid: string,
  idShopify: string
): Promise<{ pendingRemoved: number; alerts: number }> {
  const supabase = createSupabaseAdmin();

  const { data: skins, error } = await supabase
    .from("skins")
    .select(
      `
      id,
      status,
      sheet_id,
      sheets (
        lot_id,
        lots ( locked )
      )
    `
    )
    .eq("order_id", orderUuid);

  if (error || !skins) {
    throw new Error("Lecture skins impossible.");
  }

  let pendingRemoved = 0;
  let alerts = 0;

  const typed = skins as unknown as SkinRow[];

  for (const skin of typed) {
    if (skin.status === "pending") {
      const { error: delError } = await supabase
        .from("skins")
        .delete()
        .eq("id", skin.id);
      if (!delError) pendingRemoved += 1;
      continue;
    }

    if (skin.status === "shipped" || skin.status === "scrap") {
      continue;
    }

    const locked = isLotLocked(skin);
    const lotId = skin.sheets?.lot_id ?? null;

    if (skin.status === "imposed" && !locked) {
      await supabase
        .from("skins")
        .update({
          status: "scrap",
          scrap_reason: "annulation",
          sheet_id: null,
          slot: null,
          alert: null,
        })
        .eq("id", skin.id);
      continue;
    }

    if (locked || skin.status !== "pending") {
      await supabase
        .from("skins")
        .update({ alert: "commande_annulee" })
        .eq("id", skin.id);

      if (lotId) {
        await insertLotEvent(lotId, "alert", {
          skin_id: skin.id,
          reason: "commande_annulee",
          id_shopify: idShopify,
        });
      }
      alerts += 1;
    }
  }

  return { pendingRemoved, alerts };
}
