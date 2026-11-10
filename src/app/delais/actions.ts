"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { buildOrderRiskRow } from "@/lib/delais/at-risk";
import { normalizeCarrierName } from "@/lib/delais/carriers";
import {
  CARRIER_RECOMMEND_MIN_PARCELS,
  PROMISE_HOURS,
  STALE_TRACKING_BUSINESS_DAYS,
  UNKNOWN_DELIVERY_DAYS,
} from "@/lib/delais/config";
import type {
  CarrierClaimRates,
  CarrierCountryCell,
  DelaisDashboardPayload,
  DelaisPeriodDays,
  OrderRiskRow,
  StageMedianHours,
  WeeklySlaPoint,
} from "@/lib/delais/types";
import {
  isLikelyTrackCode,
  normalizeTrackCode,
} from "@/lib/scanner/track-code";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isStockOk } from "@/lib/inventory/stock-visual";

function percentile(sorted: number[], p: number): number | null {
  if (!sorted.length) return null;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

function median(sorted: number[]): number | null {
  return percentile(sorted, 50);
}

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  imposed: "Imposé",
  planche_prete: "Planche prête",
  printed: "Imprimé",
  cut: "Découpe",
  shipped: "Expédié",
};

const FLOW_STATUSES = [
  "pending",
  "imposed",
  "planche_prete",
  "printed",
  "cut",
  "shipped",
] as const;

async function inventoryIsLow(): Promise<boolean> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("inventory")
    .select("current_quantity, alert_threshold");
  if (!data?.length) return false;
  return data.some(
    (row) => !isStockOk(row.current_quantity, row.alert_threshold)
  );
}

export async function fetchOverdueOrderCount(): Promise<number> {
  try {
    const supabase = createSupabaseAdmin();
    const now = new Date().toISOString();
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .is("cancelled_at", null)
      .is("shipped_at", null)
      .lt("promise_due_at", now);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export type DelaisKpiSnapshot = {
  pctUnder48_7d: number | null;
  overdueCount: number;
};

export async function fetchDelaisKpiSnapshot(): Promise<DelaisKpiSnapshot> {
  const payload = await fetchDelaisDashboard(7);
  return {
    pctUnder48_7d: payload.sla.pctUnder48,
    overdueCount: payload.overdueCount,
  };
}

export async function fetchDelaisDashboard(
  periodDays: DelaisPeriodDays = 30
): Promise<DelaisDashboardPayload> {
  const generatedAt = new Date().toISOString();
  const now = Date.now();
  const from = new Date(now - periodDays * 86400_000).toISOString();

  const empty: DelaisDashboardPayload = {
    generatedAt,
    periodDays,
    promiseHours: PROMISE_HOURS,
    sla: {
      medianHours: null,
      p90Hours: null,
      meanHours: null,
      pctUnder48: null,
      sampleSize: 0,
    },
    weeklySla: [],
    stageMedians: [],
    persoMedianHours: null,
    catalogMedianHours: null,
    overdueCount: 0,
    atRiskCount: 0,
    openClaimsCount: 0,
    globalClaimRatePct: null,
    actionQueue: [],
    carrierMatrix: [],
    countryRecommendations: [],
    staleTracking: [],
    carrierClaims: [],
    openClaims: [],
  };

  let supabase;
  try {
    supabase = createSupabaseAdmin();
  } catch {
    return empty;
  }

  const [
    ordersRes,
    skinsRes,
    eventsRes,
    claimsRes,
    sheetsRes,
    inventoryLow,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, id_shopify, customer_name, shipping_method, placed_at, promise_due_at, shipped_at, delivered_at, ship_country, carrier, delivery_status, tracking_number, tracking_url, cancelled_at, created_at"
      )
      .gte("placed_at", from),
    supabase
      .from("skins")
      .select(
        "id, order_id, status, track_code, design_name, visual_url, visual_status, alert, reprint_of, sheet_id, created_at"
      ),
    supabase
      .from("skin_events")
      .select("skin_id, order_id, from_status, to_status, at")
      .gte("at", from)
      .order("at", { ascending: true }),
    supabase
      .from("claims")
      .select(
        "id, order_id, type, carrier, country, status, resolution, cost_eur, note, opened_at, resolved_at, orders ( id_shopify )"
      )
      .order("opened_at", { ascending: false }),
    supabase
      .from("sheets")
      .select("id, lot_id, file_status, updated_at"),
    inventoryIsLow(),
  ]);

  const orders = ordersRes.data ?? [];
  const skins = skinsRes.data ?? [];
  const events = eventsRes.data ?? [];
  const claims = claimsRes.data ?? [];
  const sheets = sheetsRes.data ?? [];

  const sheetById = new Map(
    sheets.map((s) => [
      s.id,
      {
        id: s.id,
        fileStatus: s.file_status,
        lotId: s.lot_id,
        updatedAt: s.updated_at,
      },
    ])
  );

  const skinsByOrder = new Map<string, typeof skins>();
  for (const s of skins) {
    const list = skinsByOrder.get(s.order_id) ?? [];
    list.push(s);
    skinsByOrder.set(s.order_id, list);
  }

  const shipHours: number[] = [];
  const persoHours: number[] = [];
  const catalogHours: number[] = [];

  for (const o of orders) {
    if (!o.shipped_at || !o.placed_at) continue;
    const placed = new Date(o.placed_at).getTime();
    const shipped = new Date(o.shipped_at).getTime();
    const h = (shipped - placed) / 3600_000;
    if (h < 0) continue;
    shipHours.push(h);

    const orderSkins = skinsByOrder.get(o.id) ?? [];
    const perso = orderSkins.some((s) => Boolean(s.visual_url?.trim()));
    if (perso) persoHours.push(h);
    else catalogHours.push(h);
  }

  shipHours.sort((a, b) => a - b);
  const under48 =
    shipHours.length === 0
      ? null
      : (shipHours.filter((h) => h <= PROMISE_HOURS).length / shipHours.length) *
        100;

  empty.sla = {
    medianHours: median(shipHours),
    p90Hours: percentile(shipHours, 90),
    meanHours:
      shipHours.length === 0
        ? null
        : shipHours.reduce((a, b) => a + b, 0) / shipHours.length,
    pctUnder48: under48,
    sampleSize: shipHours.length,
  };

  persoHours.sort((a, b) => a - b);
  catalogHours.sort((a, b) => a - b);
  empty.persoMedianHours = median(persoHours);
  empty.catalogMedianHours = median(catalogHours);

  const weekly = new Map<string, number[]>();
  for (const o of orders) {
    if (!o.shipped_at || !o.placed_at) continue;
    const placed = new Date(o.placed_at);
    const weekStart = new Date(placed);
    weekStart.setUTCDate(placed.getUTCDate() - placed.getUTCDay() + 1);
    const key = weekStart.toISOString().slice(0, 10);
    const h =
      (new Date(o.shipped_at).getTime() - placed.getTime()) / 3600_000;
    const bucket = weekly.get(key) ?? [];
    bucket.push(h);
    weekly.set(key, bucket);
  }

  empty.weeklySla = Array.from(weekly.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, values]) => {
      values.sort((x, y) => x - y);
      const d = new Date(weekStart + "T12:00:00Z");
      return {
        weekStart,
        weekLabel: d.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "short",
        }),
        medianHours: median(values),
        p90Hours: percentile(values, 90),
      } satisfies WeeklySlaPoint;
    });

  const dwellByStatus = new Map<string, number[]>();
  const bySkin = new Map<string, { to: string; at: number }[]>();
  for (const ev of events) {
    const list = bySkin.get(ev.skin_id) ?? [];
    list.push({ to: ev.to_status, at: new Date(ev.at).getTime() });
    bySkin.set(ev.skin_id, list);
  }
  for (const list of Array.from(bySkin.values())) {
    list.sort((a, b) => a.at - b.at);
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1];
      const cur = list[i];
      const hours = (cur.at - prev.at) / 3600_000;
      if (hours < 0 || hours > 24 * 90) continue;
      const bucket = dwellByStatus.get(prev.to) ?? [];
      bucket.push(hours);
      dwellByStatus.set(prev.to, bucket);
    }
  }

  empty.stageMedians = FLOW_STATUSES.map((status) => {
    const values = (dwellByStatus.get(status) ?? []).sort((a, b) => a - b);
    return {
      status,
      label: STATUS_LABELS[status] ?? status,
      medianHours: median(values) ?? 0,
    };
  }).filter((s) => s.medianHours > 0);

  const actionQueue: OrderRiskRow[] = [];
  let overdueCount = 0;
  let atRiskCount = 0;

  const openOrders = await supabase
    .from("orders")
    .select(
      "id, id_shopify, customer_name, shipping_method, placed_at, promise_due_at, ship_country, cancelled_at, created_at"
    )
    .is("cancelled_at", null)
    .is("shipped_at", null);

  for (const o of openOrders.data ?? []) {
    const orderSkins = skinsByOrder.get(o.id) ?? [];
    if (!orderSkins.length) continue;

    const row = buildOrderRiskRow(
      {
        id: o.id,
        idShopify: Number(o.id_shopify),
        customerName: o.customer_name,
        country: o.ship_country,
        shippingMethod: o.shipping_method,
        placedAt: o.placed_at ?? o.created_at,
        promiseDueAt:
          o.promise_due_at ??
          new Date(
            new Date(o.placed_at ?? o.created_at).getTime() +
              PROMISE_HOURS * 3600_000
          ).toISOString(),
        cancelledAt: o.cancelled_at,
        skins: orderSkins.map((s) => ({
          id: s.id,
          trackCode: s.track_code,
          status: s.status,
          designName: s.design_name,
          visualUrl: s.visual_url,
          visualStatus: s.visual_status,
          alert: s.alert,
          reprintOf: s.reprint_of,
          sheetId: s.sheet_id,
          createdAt: s.created_at,
        })),
      },
      sheetById,
      inventoryLow,
      now
    );

    if (!row) continue;
    if (row.overdue) overdueCount += 1;
    else if (row.atRisk) atRiskCount += 1;
    if (row.overdue || row.atRisk || row.reasons.length > 0) {
      actionQueue.push(row);
    }
  }

  actionQueue.sort((a, b) => b.urgencyScore - a.urgencyScore);
  empty.actionQueue = actionQueue;
  empty.overdueCount = overdueCount;
  empty.atRiskCount = atRiskCount;

  const deliveryCells = new Map<string, number[]>();
  const unknownByCell = new Map<string, { total: number; unknown: number }>();

  for (const o of orders) {
    if (!o.shipped_at || !o.delivered_at) continue;
    const country = o.ship_country?.trim() || "??";
    const carrier = normalizeCarrierName(o.carrier);
    const key = `${carrier}::${country}`;
    const days =
      (new Date(o.delivered_at).getTime() -
        new Date(o.shipped_at).getTime()) /
      86400_000;
    if (days < 0) continue;
    const list = deliveryCells.get(key) ?? [];
    list.push(days);
    deliveryCells.set(key, list);
  }

  for (const o of orders) {
    if (!o.shipped_at) continue;
    const country = o.ship_country?.trim() || "??";
    const carrier = normalizeCarrierName(o.carrier);
    const key = `${carrier}::${country}`;
    const cur = unknownByCell.get(key) ?? { total: 0, unknown: 0 };
    cur.total += 1;
    const daysSince =
      (now - new Date(o.shipped_at).getTime()) / 86400_000;
    if (
      (o.delivery_status === "inconnu" || !o.delivered_at) &&
      daysSince > UNKNOWN_DELIVERY_DAYS
    ) {
      cur.unknown += 1;
    }
    unknownByCell.set(key, cur);
  }

  const matrix: CarrierCountryCell[] = [];
  for (const [key, values] of Array.from(deliveryCells.entries())) {
    const [carrier, country] = key.split("::");
    values.sort((a, b) => a - b);
    const unk = unknownByCell.get(key);
    matrix.push({
      carrier,
      country,
      count: values.length,
      medianDays: median(values),
      p90Days: percentile(values, 90),
      pctUnder3Days:
        (values.filter((d) => d <= 3).length / values.length) * 100,
      pctUnknown: unk
        ? (unk.unknown / Math.max(unk.total, 1)) * 100
        : null,
      recommended: false,
    });
  }
  matrix.sort((a, b) => b.count - a.count);
  empty.carrierMatrix = matrix;

  const byCountry = new Map<string, CarrierCountryCell[]>();
  for (const cell of matrix) {
    const list = byCountry.get(cell.country) ?? [];
    list.push(cell);
    byCountry.set(cell.country, list);
  }

  empty.countryRecommendations = [];
  for (const [country, cells] of Array.from(byCountry.entries())) {
    const eligible = cells.filter((c) => c.count >= CARRIER_RECOMMEND_MIN_PARCELS);
    if (!eligible.length) continue;
    eligible.sort((a, b) => (a.p90Days ?? 999) - (b.p90Days ?? 999));
    const best = eligible[0];
    best.recommended = true;
    empty.countryRecommendations.push({
      country,
      carrier: best.carrier,
      sample: best.count,
    });
  }

  empty.staleTracking = orders
    .filter((o) => {
      if (!o.shipped_at || o.delivered_at) return false;
      const days =
        (now - new Date(o.shipped_at).getTime()) / 86400_000;
      return (
        days >= STALE_TRACKING_BUSINESS_DAYS &&
        o.delivery_status !== "livre"
      );
    })
    .slice(0, 30)
    .map((o) => ({
      orderId: o.id,
      idShopify: Number(o.id_shopify),
      trackingUrl: o.tracking_url,
      trackingNumber: o.tracking_number,
      shippedAt: o.shipped_at!,
      carrier: o.carrier,
    }));

  const shippedInPeriod = orders.filter(
    (o) => o.shipped_at && o.shipped_at >= from
  ).length;

  const byCarrierShipped = new Map<string, number>();
  const byCarrierClaims = new Map<
    string,
    { lost: number; damaged: number; returned: number; cost: number }
  >();

  for (const o of orders) {
    if (!o.shipped_at || o.shipped_at < from) continue;
    const c = normalizeCarrierName(o.carrier);
    byCarrierShipped.set(c, (byCarrierShipped.get(c) ?? 0) + 1);
  }

  for (const c of claims) {
    const carrier = normalizeCarrierName(c.carrier);
    const bucket = byCarrierClaims.get(carrier) ?? {
      lost: 0,
      damaged: 0,
      returned: 0,
      cost: 0,
    };
    if (c.type === "perdu") bucket.lost += 1;
    if (c.type === "abime") bucket.damaged += 1;
    if (c.type === "retour") bucket.returned += 1;
    bucket.cost += Number(c.cost_eur ?? 0);
    byCarrierClaims.set(carrier, bucket);
  }

  const carrierClaims: CarrierClaimRates[] = [];
  for (const [carrier, shipped] of Array.from(byCarrierShipped.entries())) {
    const cl = byCarrierClaims.get(carrier) ?? {
      lost: 0,
      damaged: 0,
      returned: 0,
      cost: 0,
    };
    const totalClaims = cl.lost + cl.damaged + cl.returned;
    carrierClaims.push({
      carrier,
      shipped,
      lost: cl.lost,
      damaged: cl.damaged,
      returned: cl.returned,
      totalClaims,
      claimRatePct: shipped > 0 ? (totalClaims / shipped) * 100 : 0,
      costEur: cl.cost,
    });
  }
  carrierClaims.sort((a, b) => b.claimRatePct - a.claimRatePct);
  empty.carrierClaims = carrierClaims;

  const openClaims = claims.filter((c) => c.status !== "resolu");
  empty.openClaimsCount = openClaims.length;
  empty.openClaims = openClaims.slice(0, 50).map((c) => {
    const ord = c.orders;
    const idShopify = Array.isArray(ord)
      ? ord[0]?.id_shopify
      : (ord as { id_shopify: number } | null)?.id_shopify;
    return {
      id: c.id,
      orderId: c.order_id,
      idShopify: Number(idShopify ?? 0),
      type: c.type,
      carrier: c.carrier,
      country: c.country,
      status: c.status,
      resolution: c.resolution,
      costEur: c.cost_eur != null ? Number(c.cost_eur) : null,
      note: c.note,
      openedAt: c.opened_at,
      resolvedAt: c.resolved_at,
    };
  });

  const totalClaims = claims.filter((c) => c.opened_at >= from).length;
  empty.globalClaimRatePct =
    shippedInPeriod > 0 ? (totalClaims / shippedInPeriod) * 100 : null;

  return empty;
}

const createClaimSchema = z.object({
  orderId: z.string().uuid(),
  skinId: z.string().uuid().optional(),
  type: z.enum(["perdu", "abime", "retour", "non_conforme", "autre"]),
  resolution: z
    .enum(["reimpression", "remboursement", "renvoi", "aucun"])
    .optional(),
  costEur: z.number().min(0).optional(),
  note: z.string().max(2000).optional(),
});

export async function createClaim(
  input: z.infer<typeof createClaimSchema>
): Promise<{ ok: true; claimId: string } | { ok: false; error: string }> {
  const parsed = createClaimSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Données invalides." };
  }

  const supabase = createSupabaseAdmin();
  const { data: order } = await supabase
    .from("orders")
    .select("id, carrier, ship_country")
    .eq("id", parsed.data.orderId)
    .maybeSingle();

  if (!order) return { ok: false, error: "Commande introuvable." };

  const { data: claim, error } = await supabase
    .from("claims")
    .insert({
      order_id: parsed.data.orderId,
      skin_id: parsed.data.skinId ?? null,
      type: parsed.data.type,
      carrier: order.carrier,
      country: order.ship_country,
      status: "ouvert",
      resolution: parsed.data.resolution ?? null,
      cost_eur: parsed.data.costEur ?? null,
      note: parsed.data.note ?? null,
    })
    .select("id")
    .single();

  if (error || !claim) {
    return { ok: false, error: "Création réclamation impossible." };
  }

  if (parsed.data.resolution === "reimpression" && parsed.data.skinId) {
    const { data: skin } = await supabase
      .from("skins")
      .select(
        "id, order_id, design_name, track_code, visual_url, orientation, framing, product_handle, shopify_line_item_id"
      )
      .eq("id", parsed.data.skinId)
      .maybeSingle();
    if (skin) {
      const prefixMatch = skin.track_code.match(/^(\d+)-/);
      const orderPrefix = prefixMatch?.[1] ?? "9000";
      const tempTrack = `${orderPrefix}-F0-S${(Date.now() % 4) + 1}`;
      await supabase.from("skins").insert({
        order_id: skin.order_id,
        design_name: skin.design_name,
        status: "pending",
        track_code: tempTrack,
        shopify_line_item_id: skin.shopify_line_item_id,
        visual_url: skin.visual_url,
        orientation: skin.orientation,
        framing: skin.framing,
        product_handle: skin.product_handle,
        reprint_of: skin.id,
      });
    }
  }

  revalidatePath("/delais");
  return { ok: true, claimId: claim.id };
}

export async function updateClaimStatus(
  claimId: string,
  status: "ouvert" | "en_cours" | "resolu"
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createSupabaseAdmin();
  const patch: Record<string, string> = { status };
  if (status === "resolu") {
    patch.resolved_at = new Date().toISOString();
  }
  const { error } = await supabase.from("claims").update(patch).eq("id", claimId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/delais");
  return { ok: true };
}

export async function lookupOrderForClaim(
  query: string
): Promise<
  | {
      ok: true;
      orderId: string;
      idShopify: number;
      customerName: string;
      skins: { id: string; trackCode: string; designName: string }[];
    }
  | { ok: false; error: string }
> {
  const q = query.trim();
  if (!q) return { ok: false, error: "Recherche vide." };

  const supabase = createSupabaseAdmin();

  if (isLikelyTrackCode(q)) {
    const code = normalizeTrackCode(q);
    const { data: skin } = await supabase
      .from("skins")
      .select(
        "id, track_code, design_name, orders ( id, id_shopify, customer_name )"
      )
      .eq("track_code", code)
      .maybeSingle();
    if (!skin) return { ok: false, error: "Track code inconnu." };
    const ord = skin.orders;
    const order = Array.isArray(ord) ? ord[0] : ord;
    if (!order) return { ok: false, error: "Commande introuvable." };
    const { data: siblings } = await supabase
      .from("skins")
      .select("id, track_code, design_name")
      .eq("order_id", order.id);
    return {
      ok: true,
      orderId: order.id,
      idShopify: Number(order.id_shopify),
      customerName: order.customer_name,
      skins: (siblings ?? []).map((s) => ({
        id: s.id,
        trackCode: s.track_code,
        designName: s.design_name,
      })),
    };
  }

  const numeric = q.replace(/\D/g, "");
  if (!numeric) return { ok: false, error: "Format non reconnu." };

  const { data: order } = await supabase
    .from("orders")
    .select("id, id_shopify, customer_name")
    .eq("id_shopify", numeric)
    .maybeSingle();

  if (!order) return { ok: false, error: "Commande Shopify introuvable." };

  const { data: skins } = await supabase
    .from("skins")
    .select("id, track_code, design_name")
    .eq("order_id", order.id);

  return {
    ok: true,
    orderId: order.id,
    idShopify: Number(order.id_shopify),
    customerName: order.customer_name,
    skins: (skins ?? []).map((s) => ({
      id: s.id,
      trackCode: s.track_code,
      designName: s.design_name,
    })),
  };
}
