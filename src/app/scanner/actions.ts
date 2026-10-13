"use server";

import { buildScanDisplayLabel } from "@/lib/scanner/display-label";
import type { ScannedSkinPayload } from "@/lib/scanner/types";
import {
  isLikelyTrackCode,
  normalizeTrackCode,
  parseShopifyOrderIdFromScan,
} from "@/lib/scanner/track-code";
import { isShopifyAdminConfigured } from "@/lib/shopify/admin-config";
import { fulfillSkinUnitOnShopify } from "@/lib/shopify/fulfill-skin";
import { normalizeShopifyNumericId } from "@/lib/shopify/numeric-id";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const SHIPPABLE_STATUSES = ["imposed", "printed", "cut"] as const;

export type FetchSkinByTrackResult =
  | {
      ok: true;
      skin: ScannedSkinPayload;
      displayLabel: string;
      /** Autres skins de la même commande (recherche par ID Shopify). */
      orderSkins?: ScannedSkinPayload[];
    }
  | { ok: false; error: string };

function mapSkinRow(
  row: {
    id: string;
    design_name: string;
    track_code: string;
    status: string;
  },
  orderRecord: {
    id_shopify: number;
    customer_name: string;
    shipping_method: string;
  }
): ScannedSkinPayload {
  return {
    skinId: row.id,
    trackCode: row.track_code,
    designName: row.design_name,
    status: row.status,
    orderShopifyId: orderRecord.id_shopify,
    customerName: orderRecord.customer_name,
    shippingMethod: orderRecord.shipping_method,
  };
}

export type ShipSkinResult =
  | { ok: true; shopifySynced?: boolean; shopifyWarning?: string }
  | { ok: false; error: string };

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

  const shopifyOrderId = parseShopifyOrderIdFromScan(trackCode);

  if (shopifyOrderId) {
    const { data: orderRow, error: orderError } = await supabase
      .from("orders")
      .select("id, id_shopify, customer_name, shipping_method")
      .eq("id_shopify", shopifyOrderId)
      .maybeSingle();

    if (orderError) {
      console.error("[scanner] order by id_shopify", orderError);
      return { ok: false, error: "Erreur base de données." };
    }

    if (!orderRow) {
      return {
        ok: false,
        error: `Aucune commande Shopify ${shopifyOrderId} en base.`,
      };
    }

    const { data: skinRows, error: skinsError } = await supabase
      .from("skins")
      .select("id, design_name, track_code, status")
      .eq("order_id", orderRow.id)
      .order("track_code", { ascending: true });

    if (skinsError) {
      console.error("[scanner] skins by order", skinsError);
      return { ok: false, error: "Erreur base de données." };
    }

    if (!skinRows?.length) {
      return {
        ok: false,
        error: `Commande ${shopifyOrderId} sans skin en base.`,
      };
    }

    const orderSkins = skinRows.map((row) =>
      mapSkinRow(row, orderRow)
    );
    const primary =
      orderSkins.find((s) =>
        SHIPPABLE_STATUSES.includes(
          s.status as (typeof SHIPPABLE_STATUSES)[number]
        )
      ) ?? orderSkins[0];

    return {
      ok: true,
      skin: primary,
      displayLabel: buildScanDisplayLabel(primary),
      orderSkins,
    };
  }

  if (!isLikelyTrackCode(trackCode)) {
    return {
      ok: false,
      error: `Format inconnu. Utilise un track code (ex. 1042-F1-S1) ou l'ID Shopify commande.`,
    };
  }

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

  const skin = mapSkinRow(data, orderRecord);

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
    .select(
      `
      id,
      status,
      track_code,
      shopify_line_item_id,
      orders (
        id_shopify,
        shipping_method
      )
    `
    )
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

  if (!isShopifyAdminConfigured()) {
    return {
      ok: true,
      shopifySynced: false,
      shopifyWarning:
        "Expédié dans Drip OS — Shopify non configuré (SHOPIFY_STORE_DOMAIN + SHOPIFY_ADMIN_ACCESS_TOKEN sur Vercel).",
    };
  }

  const order = existing.orders;
  const orderRecord = Array.isArray(order) ? order[0] : order;
  const orderShopifyId = normalizeShopifyNumericId(orderRecord?.id_shopify);
  const lineItemId = normalizeShopifyNumericId(existing.shopify_line_item_id);

  if (!orderShopifyId || !lineItemId) {
    return {
      ok: true,
      shopifySynced: false,
      shopifyWarning:
        "Expédié dans Drip OS — pas de lien Shopify sur ce skin (commande avant migration 005 ou line item manquant).",
    };
  }

  const shopifyResult = await fulfillSkinUnitOnShopify({
    orderShopifyId,
    shopifyLineItemId: lineItemId,
    trackingNumber: existing.track_code,
    shippingMethod: orderRecord?.shipping_method,
  });

  if (!shopifyResult.ok) {
    return {
      ok: true,
      shopifySynced: false,
      shopifyWarning: `Expédié dans Drip OS — Shopify: ${shopifyResult.error}`,
    };
  }

  return { ok: true, shopifySynced: true };
}
