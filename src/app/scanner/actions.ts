"use server";

import { buildScanDisplayLabel } from "@/lib/scanner/display-label";
import type { ScannedSkinPayload } from "@/lib/scanner/types";
import { normalizeTrackCode } from "@/lib/scanner/track-code";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const SHIPPABLE_STATUSES = ["imposed", "printed", "cut"] as const;

export type FetchSkinByTrackResult =
  | { ok: true; skin: ScannedSkinPayload; displayLabel: string }
  | { ok: false; error: string };

export type ShipSkinResult = { ok: true } | { ok: false; error: string };

export async function fetchSkinByTrackCode(
  rawCode: string
): Promise<FetchSkinByTrackResult> {
  try {
    return await fetchSkinByTrackCodeInner(rawCode);
  } catch (e) {
    console.error("[scanner] fetchSkinByTrackCode", e);
    return { ok: false, error: "Erreur serveur lors de la lecture du code." };
  }
}

async function fetchSkinByTrackCodeInner(
  rawCode: string
): Promise<FetchSkinByTrackResult> {
  const trackCode = normalizeTrackCode(rawCode);

  if (!trackCode) {
    return { ok: false, error: "Code vide." };
  }

  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("skins")
    .select(
      `
      id,
      design_name,
      track_code,
      status,
      orders (
        id_shopify,
        customer_name,
        shipping_method
      )
    `
    )
    .eq("track_code", trackCode)
    .maybeSingle();

  if (error) {
    console.error("[scanner] fetchSkinByTrackCode", error);
    return { ok: false, error: "Erreur base de données." };
  }

  if (!data) {
    return { ok: false, error: `Aucun skin pour le code ${trackCode}.` };
  }

  const order = data.orders;
  const orderRecord = Array.isArray(order) ? order[0] : order;

  if (!orderRecord) {
    return { ok: false, error: "Commande associée introuvable." };
  }

  const skin: ScannedSkinPayload = {
    skinId: data.id,
    trackCode: data.track_code,
    designName: data.design_name,
    status: data.status,
    orderShopifyId: orderRecord.id_shopify,
    customerName: orderRecord.customer_name,
    shippingMethod: orderRecord.shipping_method,
  };

  return {
    ok: true,
    skin,
    displayLabel: buildScanDisplayLabel(skin),
  };
}

export async function markSkinShipped(skinId: string): Promise<ShipSkinResult> {
  try {
    return await markSkinShippedInner(skinId);
  } catch (e) {
    console.error("[scanner] markSkinShipped", e);
    return { ok: false, error: "Erreur serveur lors de l'expédition." };
  }
}

async function markSkinShippedInner(skinId: string): Promise<ShipSkinResult> {
  if (!skinId?.trim()) {
    return { ok: false, error: "Skin invalide." };
  }

  const supabase = createSupabaseAdmin();

  const { data: existing, error: readError } = await supabase
    .from("skins")
    .select("id, status")
    .eq("id", skinId)
    .maybeSingle();

  if (readError || !existing) {
    return { ok: false, error: "Skin introuvable." };
  }

  if (existing.status === "shipped") {
    return { ok: false, error: "Ce skin est déjà expédié." };
  }

  if (
    !SHIPPABLE_STATUSES.includes(
      existing.status as (typeof SHIPPABLE_STATUSES)[number]
    )
  ) {
    return {
      ok: false,
      error: `Statut « ${existing.status} » — passe d'abord par Imposition / Atelier (pending ou scrap).`,
    };
  }

  const { data: updated, error } = await supabase
    .from("skins")
    .update({ status: "shipped" })
    .eq("id", skinId)
    .in("status", [...SHIPPABLE_STATUSES])
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[scanner] markSkinShipped", error);
    return { ok: false, error: "Échec mise à jour expédition." };
  }

  if (!updated) {
    return {
      ok: false,
      error: "Mise à jour impossible (statut changé entre-temps). Rescanne le code.",
    };
  }

  return { ok: true };
}
