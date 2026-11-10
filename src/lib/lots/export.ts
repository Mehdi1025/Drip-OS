import { sheetCodeFromIndex } from "@/lib/lots/sheet-code";
import { insertLotEvent } from "@/lib/lots/events";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export type LotExportRow = {
  lot: string;
  feuille: string;
  slot: string;
  track_code: string;
  commande: string;
  produit: string;
  visuel_url: string;
  orientation: string;
  cadrage: string;
  reimpression: string;
};

const EXPORT_HEADERS: (keyof LotExportRow)[] = [
  "lot",
  "feuille",
  "slot",
  "track_code",
  "commande",
  "produit",
  "visuel_url",
  "orientation",
  "cadrage",
  "reimpression",
];

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatShopifyOrderLabel(idShopify: number | null | undefined): string {
  if (!idShopify) return "";
  const digits = String(idShopify);
  const short = digits.length > 4 ? digits.slice(-4) : digits;
  return `#${short}`;
}

export async function buildLotExportRows(
  lotId: string
): Promise<{ rows: LotExportRow[]; version: number; locked: boolean }> {
  const supabase = createSupabaseAdmin();

  const { data: lot, error: lotError } = await supabase
    .from("lots")
    .select("id, locked, export_version")
    .eq("id", lotId)
    .maybeSingle();

  if (lotError || !lot) {
    throw new Error("Lot introuvable.");
  }

  const { data: sheets, error: sheetsError } = await supabase
    .from("sheets")
    .select("id, sheet_index")
    .eq("lot_id", lotId)
    .order("sheet_index", { ascending: true });

  if (sheetsError) {
    throw new Error("Impossible de lire les feuilles.");
  }

  const sheetIds = (sheets ?? []).map((s) => s.id);

  type SkinExportRow = {
    track_code: string;
    visual_url: string | null;
    orientation: string | null;
    framing: string | null;
    product_handle: string | null;
    reprint_of: string | null;
    orders: { id_shopify: number } | { id_shopify: number }[] | null;
  };

  const skinsBySheetSlot = new Map<string, Record<number, SkinExportRow>>();

  if (sheetIds.length > 0) {
    const { data: skins, error: skinsError } = await supabase
      .from("skins")
      .select(
        `
        sheet_id,
        slot,
        track_code,
        visual_url,
        orientation,
        framing,
        product_handle,
        reprint_of,
        orders ( id_shopify )
      `
      )
      .in("sheet_id", sheetIds);

    if (skinsError) {
      throw new Error("Impossible de lire les skins.");
    }

    for (const row of skins ?? []) {
      if (!row.sheet_id || !row.slot) continue;
      const key = row.sheet_id;
      const map = skinsBySheetSlot.get(key) ?? {};
      map[row.slot] = row as SkinExportRow;
      skinsBySheetSlot.set(key, map);
    }
  }

  const rows: LotExportRow[] = [];

  for (const sheet of sheets ?? []) {
    const feuille = sheetCodeFromIndex(sheet.sheet_index ?? 1);
    const slotMap = skinsBySheetSlot.get(sheet.id) ?? {};

    for (let slot = 1; slot <= 4; slot++) {
      const skin = slotMap[slot];
      const slotLabel = `S${slot}`;

      if (!skin) {
        rows.push({
          lot: lotId,
          feuille,
          slot: slotLabel,
          track_code: "",
          commande: "",
          produit: "vide",
          visuel_url: "",
          orientation: "",
          cadrage: "",
          reimpression: "",
        });
        continue;
      }

      const order = skin.orders;
      const orderRecord = Array.isArray(order) ? order[0] : order;

      rows.push({
        lot: lotId,
        feuille,
        slot: slotLabel,
        track_code: skin.track_code,
        commande: formatShopifyOrderLabel(orderRecord?.id_shopify),
        produit: skin.product_handle?.trim() || "skin",
        visuel_url: skin.visual_url ?? "",
        orientation: skin.orientation ?? "",
        cadrage: skin.framing ?? "",
        reimpression: skin.reprint_of ? "oui" : "",
      });
    }
  }

  return {
    rows,
    version: lot.export_version ?? 0,
    locked: Boolean(lot.locked),
  };
}

export async function recordLotExport(lotId: string): Promise<number> {
  const supabase = createSupabaseAdmin();

  const { data: lot, error } = await supabase
    .from("lots")
    .select("locked, export_version, exported_at")
    .eq("id", lotId)
    .single();

  if (error || !lot) {
    throw new Error("Lot introuvable.");
  }

  const nextVersion = (lot.export_version ?? 0) + 1;
  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("lots")
    .update({
      locked: true,
      export_version: nextVersion,
      exported_at: lot.exported_at ?? now,
    })
    .eq("id", lotId);

  if (updateError) {
    throw new Error("Échec mise à jour lot.");
  }

  await insertLotEvent(lotId, "export", {
    format: "export",
    version: nextVersion,
  });

  return nextVersion;
}

export function lotExportToCsv(rows: LotExportRow[]): string {
  const lines = [
    EXPORT_HEADERS.join(","),
    ...rows.map((row) =>
      EXPORT_HEADERS.map((h) => csvEscape(row[h] ?? "")).join(",")
    ),
  ];
  return `\uFEFF${lines.join("\r\n")}`;
}

export function lotExportFilename(
  lotId: string,
  version: number,
  format: "csv" | "json"
): string {
  return `${lotId}_v${version}.${format}`;
}
