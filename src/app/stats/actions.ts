"use server";

import {
  inventoryCategoryForItem,
  INVENTORY_SECTIONS,
} from "@/lib/inventory/categories";
import { estimateDaysUntilThreshold } from "@/lib/stats/inventory-projection";
import {
  buildDailyBuckets,
  fillBucketCount,
  sumBucketField,
} from "@/lib/stats/buckets";
import { periodDelta } from "@/lib/stats/metrics";
import type {
  AdvancedStatsPayload,
  InventoryCategoryHealth,
  PeriodMetric,
  ScrapBreakdown,
  SkinStatusKey,
} from "@/lib/stats/types";
import { SCRAP_REASONS } from "@/lib/workshop/scrap-reasons";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const SKIN_STATUSES: SkinStatusKey[] = [
  "pending",
  "imposed",
  "planche_prete",
  "printed",
  "cut",
  "shipped",
  "scrap",
];

const SERIES_DAYS = 30;

function emptyPeriod(): PeriodMetric {
  return { orders: 0, shipped: 0, lots: 0, sheets: 0, scrap: 0 };
}

function buildFallback(): AdvancedStatsPayload {
  const generatedAt = new Date().toISOString();
  const emptyStatus = Object.fromEntries(
    SKIN_STATUSES.map((s) => [s, 0])
  ) as Record<SkinStatusKey, number>;
  const zero = emptyPeriod();

  return {
    generatedAt,
    totals: { orders: 0, skins: 0, lots: 0, sheets: 0 },
    skinsByStatus: emptyStatus,
    dailySeries: buildDailyBuckets(SERIES_DAYS),
    scrapBreakdown: SCRAP_REASONS.map((r) => ({
      reason: r.value,
      label: r.label,
      count: 0,
    })),
    inventory: [],
    inventoryByCategory: INVENTORY_SECTIONS.map((s) => ({
      id: s.id,
      title: s.title,
      itemCount: 0,
      alertCount: 0,
    })),
    inventoryAlertCount: 0,
    recentLots: [],
    recentOrders: [],
    shippingMethods: [],
    periodComparison: {
      last7: zero,
      prev7: zero,
      deltas: { orders: null, shipped: null, lots: null, sheets: null },
    },
    production: {
      oldestPendingAgeHours: null,
      skinsPerSheet: 0,
      ordersAwaitingShipment: 0,
      fillRatePct: 0,
      sheetsWithoutFileOver12h: 0,
      pendingOver24h: 0,
      reprintsLast7Days: 0,
    },
    kpis: {
      shippedRatePct: 0,
      scrapRatePct: 0,
      avgSkinsPerOrder: 0,
      pendingQueue: 0,
      inProduction: 0,
      readyToShip: 0,
      throughput7d: zero,
    },
  };
}

function metricFromBuckets(
  buckets: AdvancedStatsPayload["dailySeries"],
  start: number,
  end: number,
  scrapCount: number
): PeriodMetric {
  return {
    orders: sumBucketField(buckets, "orders", start, end),
    shipped: sumBucketField(buckets, "shipped", start, end),
    lots: sumBucketField(buckets, "lots", start, end),
    sheets: sumBucketField(buckets, "sheets", start, end),
    scrap: scrapCount,
  };
}

export async function fetchAdvancedStats(): Promise<AdvancedStatsPayload> {
  const fallback = buildFallback();

  try {
    const supabase = createSupabaseAdmin();
    const generatedAt = new Date().toISOString();

    const since30 = new Date();
    since30.setUTCDate(since30.getUTCDate() - (SERIES_DAYS - 1));
    since30.setUTCHours(0, 0, 0, 0);
    const sinceIso = since30.toISOString();

    const since14 = new Date();
    since14.setUTCDate(since14.getUTCDate() - 13);
    since14.setUTCHours(0, 0, 0, 0);

    const [
      ordersCount,
      skinsCount,
      lotsCount,
      sheetsCount,
      statusCounts,
      ordersWeek,
      shippedWeek,
      lotsWeek,
      sheetsWeek,
      scrapWeekRows,
      scrapRows,
      inventoryRows,
      recentLotsRows,
      recentOrdersRows,
      shippingRows,
      oldestPendingRow,
      skinsWithSheetCount,
    ] = await Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("skins").select("id", { count: "exact", head: true }),
      supabase.from("lots").select("id", { count: "exact", head: true }),
      supabase.from("sheets").select("id", { count: "exact", head: true }),
      Promise.all(
        SKIN_STATUSES.map(async (status) => {
          const { count } = await supabase
            .from("skins")
            .select("id", { count: "exact", head: true })
            .eq("status", status);
          return [status, count ?? 0] as const;
        })
      ),
      supabase
        .from("orders")
        .select("created_at")
        .gte("created_at", sinceIso),
      supabase
        .from("skins")
        .select("updated_at")
        .eq("status", "shipped")
        .gte("updated_at", sinceIso),
      supabase
        .from("lots")
        .select("created_at")
        .gte("created_at", sinceIso),
      supabase
        .from("sheets")
        .select("created_at")
        .gte("created_at", sinceIso),
      supabase
        .from("skins")
        .select("updated_at")
        .eq("status", "scrap")
        .gte("updated_at", since14.toISOString()),
      supabase
        .from("skins")
        .select("scrap_reason")
        .eq("status", "scrap"),
      supabase
        .from("inventory")
        .select(
          "id, item_name, current_quantity, unit, alert_threshold, usage_per_sheet"
        )
        .order("item_name"),
      supabase
        .from("lots")
        .select("id, created_at")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("orders")
        .select("id, id_shopify, customer_name, shipping_method, created_at")
        .order("created_at", { ascending: false })
        .limit(12),
      supabase.from("orders").select("shipping_method"),
      supabase
        .from("skins")
        .select("created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(1),
      supabase
        .from("skins")
        .select("id", { count: "exact", head: true })
        .not("sheet_id", "is", null),
    ]);

    const skinsByStatus = Object.fromEntries(statusCounts) as Record<
      SkinStatusKey,
      number
    >;

    const dailySeries = buildDailyBuckets(SERIES_DAYS);

    fillBucketCount(
      dailySeries,
      (ordersWeek.data ?? []).map((r) => ({ ts: r.created_at })),
      "orders"
    );
    fillBucketCount(
      dailySeries,
      (shippedWeek.data ?? []).map((r) => ({ ts: r.updated_at })),
      "shipped"
    );
    fillBucketCount(
      dailySeries,
      (lotsWeek.data ?? []).map((r) => ({ ts: r.created_at })),
      "lots"
    );
    fillBucketCount(
      dailySeries,
      (sheetsWeek.data ?? []).map((r) => ({ ts: r.created_at })),
      "sheets"
    );

    const scrapLast7 = (scrapWeekRows.data ?? []).filter((r) => {
      const day = r.updated_at.slice(0, 10);
      const idx = dailySeries.findIndex((d) => d.date === day);
      return idx >= dailySeries.length - 7;
    }).length;

    const scrapPrev7 = (scrapWeekRows.data ?? []).length - scrapLast7;

    const last7Start = dailySeries.length - 7;
    const last7End = dailySeries.length - 1;
    const prev7Start = dailySeries.length - 14;
    const prev7End = dailySeries.length - 8;

    const last7 = metricFromBuckets(
      dailySeries,
      last7Start,
      last7End,
      scrapLast7
    );
    const prev7 = metricFromBuckets(
      dailySeries,
      prev7Start,
      prev7End,
      scrapPrev7
    );

    const dOrders = periodDelta(last7.orders, prev7.orders);
    const dShipped = periodDelta(last7.shipped, prev7.shipped);
    const dLots = periodDelta(last7.lots, prev7.lots);
    const dSheets = periodDelta(last7.sheets, prev7.sheets);

    const scrapCounts = new Map<string, number>();
    for (const row of scrapRows.data ?? []) {
      const key = row.scrap_reason ?? "unknown";
      scrapCounts.set(key, (scrapCounts.get(key) ?? 0) + 1);
    }

    const scrapBreakdown: ScrapBreakdown[] = SCRAP_REASONS.map((r) => ({
      reason: r.value,
      label: r.label,
      count: scrapCounts.get(r.value) ?? 0,
    }));
    const unknownScrap = scrapCounts.get("unknown") ?? 0;
    if (unknownScrap > 0) {
      scrapBreakdown.push({
        reason: "unknown",
        label: "Non renseigné",
        count: unknownScrap,
      });
    }

    const sheetsPerDay = last7.sheets / 7;
    const ordersPerDay = last7.orders / 7;

    const inventory = (inventoryRows.data ?? []).map((row) => {
      const low = row.current_quantity <= row.alert_threshold;
      const category = inventoryCategoryForItem(row.item_name);
      const daysUntilThreshold = estimateDaysUntilThreshold(
        {
          item_name: row.item_name,
          current_quantity: row.current_quantity,
          alert_threshold: row.alert_threshold,
          usage_per_sheet: row.usage_per_sheet,
        },
        sheetsPerDay,
        ordersPerDay
      );
      return {
        id: row.id,
        name: row.item_name,
        current: row.current_quantity,
        threshold: row.alert_threshold,
        unit: row.unit,
        low,
        category,
        daysUntilThreshold,
      };
    });

    const inventoryAlertCount = inventory.filter((i) => i.low).length;

    const categoryHealth = new Map<string, InventoryCategoryHealth>();
    for (const section of INVENTORY_SECTIONS) {
      categoryHealth.set(section.id, {
        id: section.id,
        title: section.title,
        itemCount: 0,
        alertCount: 0,
      });
    }
    categoryHealth.set("autre", {
      id: "autre",
      title: "Autres",
      itemCount: 0,
      alertCount: 0,
    });

    for (const item of inventory) {
      const bucket = categoryHealth.get(item.category);
      if (!bucket) continue;
      bucket.itemCount += 1;
      if (item.low) bucket.alertCount += 1;
    }

    const inventoryByCategory = INVENTORY_SECTIONS.map(
      (s) => categoryHealth.get(s.id)!
    ).concat(
      (categoryHealth.get("autre")?.itemCount ?? 0) > 0
        ? [categoryHealth.get("autre")!]
        : []
    );

    const shippingMap = new Map<string, number>();
    for (const row of shippingRows.data ?? []) {
      const method = row.shipping_method?.trim() || "Non renseigné";
      shippingMap.set(method, (shippingMap.get(method) ?? 0) + 1);
    }
    const shippingMethods = Array.from(shippingMap.entries())
      .map(([method, count]) => ({ method, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    let recentLots: AdvancedStatsPayload["recentLots"] = [];
    const lots = recentLotsRows.data ?? [];
    if (lots.length > 0) {
      const lotIds = lots.map((l) => l.id);
      const { data: lotSheets } = await supabase
        .from("sheets")
        .select("id, lot_id")
        .in("lot_id", lotIds);
      const sheetIds = (lotSheets ?? []).map((s) => s.id);
      const skinsByLot = new Map<string, number>();
      const sheetsByLot = new Map<string, number>();

      for (const s of lotSheets ?? []) {
        sheetsByLot.set(s.lot_id, (sheetsByLot.get(s.lot_id) ?? 0) + 1);
      }

      if (sheetIds.length > 0) {
        const { data: lotSkins } = await supabase
          .from("skins")
          .select("sheet_id")
          .in("sheet_id", sheetIds);
        const lotBySheet = new Map(
          (lotSheets ?? []).map((s) => [s.id, s.lot_id])
        );
        for (const skin of lotSkins ?? []) {
          if (!skin.sheet_id) continue;
          const lotId = lotBySheet.get(skin.sheet_id);
          if (!lotId) continue;
          skinsByLot.set(lotId, (skinsByLot.get(lotId) ?? 0) + 1);
        }
      }
      recentLots = lots.map((l) => ({
        lotId: l.id,
        createdAt: l.created_at,
        skinCount: skinsByLot.get(l.id) ?? 0,
        sheetCount: sheetsByLot.get(l.id) ?? 0,
      }));
    }

    const recentOrderIds = (recentOrdersRows.data ?? []).map((o) => o.id);
    const skinsByOrder = new Map<
      string,
      { shipped: number; scrap: number; other: number }
    >();

    if (recentOrderIds.length > 0) {
      const { data: orderSkins } = await supabase
        .from("skins")
        .select("order_id, status")
        .in("order_id", recentOrderIds);

      for (const skin of orderSkins ?? []) {
        const cur = skinsByOrder.get(skin.order_id) ?? {
          shipped: 0,
          scrap: 0,
          other: 0,
        };
        if (skin.status === "shipped") cur.shipped += 1;
        else if (skin.status === "scrap") cur.scrap += 1;
        else cur.other += 1;
        skinsByOrder.set(skin.order_id, cur);
      }
    }

    const recentOrders = (recentOrdersRows.data ?? []).map((o) => {
      const split = skinsByOrder.get(o.id) ?? {
        shipped: 0,
        scrap: 0,
        other: 0,
      };
      const skinCount = split.shipped + split.scrap + split.other;
      return {
        id: o.id,
        shopifyId: Number(o.id_shopify),
        customerName: o.customer_name,
        shippingMethod: o.shipping_method,
        createdAt: o.created_at,
        skinCount,
        shippedCount: split.shipped,
        inProgressCount: split.other,
        scrapCount: split.scrap,
      };
    });

    const totalOrders = ordersCount.count ?? 0;
    const totalSheets = sheetsCount.count ?? 0;
    const imposedSkins = skinsWithSheetCount.count ?? 0;
    const skinsPerSheet =
      totalSheets > 0
        ? Math.round((imposedSkins / totalSheets) * 10) / 10
        : 0;

    let ordersAwaitingShipment = 0;
    if (totalOrders > 0) {
      const { data: openOrders } = await supabase
        .from("skins")
        .select("order_id")
        .neq("status", "shipped");
      const uniqueOrders = new Set((openOrders ?? []).map((s) => s.order_id));
      ordersAwaitingShipment = uniqueOrders.size;
    }
    const totalSkins = skinsCount.count ?? 0;
    const shipped = skinsByStatus.shipped;
    const scrap = skinsByStatus.scrap;

    const shippedRatePct =
      totalSkins > 0 ? Math.round((shipped / totalSkins) * 100) : 0;
    const scrapRatePct =
      totalSkins > 0 ? Math.round((scrap / totalSkins) * 100) : 0;
    const avgSkinsPerOrder =
      totalOrders > 0
        ? Math.round((totalSkins / totalOrders) * 10) / 10
        : 0;

    const fillRatePct =
      last7.orders > 0
        ? Math.round(Math.min(100, (last7.shipped / last7.orders) * 100))
        : 0;

    const oldestPendingAgeHours =
      oldestPendingRow.data?.[0]?.created_at != null
        ? (Date.now() -
            new Date(oldestPendingRow.data[0].created_at).getTime()) /
          (1000 * 60 * 60)
        : null;

    const staleCutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    const { count: staleSheets } = await supabase
      .from("sheets")
      .select("id", { count: "exact", head: true })
      .eq("file_status", "attente_fichier")
      .lt("created_at", staleCutoff);

    const pendingCutoff = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString();
    const { count: stalePending } = await supabase
      .from("skins")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .lt("created_at", pendingCutoff);

    const { count: reprints7 } = await supabase
      .from("skins")
      .select("id", { count: "exact", head: true })
      .not("reprint_of", "is", null)
      .gte("created_at", since14.toISOString());

    return {
      generatedAt,
      totals: {
        orders: totalOrders,
        skins: totalSkins,
        lots: lotsCount.count ?? 0,
        sheets: totalSheets,
      },
      skinsByStatus,
      dailySeries,
      scrapBreakdown,
      inventory,
      inventoryByCategory,
      inventoryAlertCount,
      recentLots,
      recentOrders,
      shippingMethods,
      periodComparison: {
        last7,
        prev7,
        deltas: {
          orders: dOrders.deltaPct,
          shipped: dShipped.deltaPct,
          lots: dLots.deltaPct,
          sheets: dSheets.deltaPct,
        },
      },
      production: {
        oldestPendingAgeHours,
        skinsPerSheet,
        ordersAwaitingShipment,
        fillRatePct,
        sheetsWithoutFileOver12h: staleSheets ?? 0,
        pendingOver24h: stalePending ?? 0,
        reprintsLast7Days: reprints7 ?? 0,
      },
      kpis: {
        shippedRatePct,
        scrapRatePct,
        avgSkinsPerOrder,
        pendingQueue: skinsByStatus.pending,
        inProduction:
          skinsByStatus.imposed +
          skinsByStatus.planche_prete +
          skinsByStatus.printed +
          skinsByStatus.cut,
        readyToShip: skinsByStatus.cut,
        throughput7d: last7,
      },
    };
  } catch (e) {
    console.error("[stats] fetchAdvancedStats", e);
    return fallback;
  }
}
