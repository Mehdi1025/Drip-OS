"use server";

import type {
  AdvancedStatsPayload,
  DailyCount,
  ScrapBreakdown,
  SkinStatusKey,
} from "@/lib/stats/types";
import { SCRAP_REASONS } from "@/lib/workshop/scrap-reasons";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const SKIN_STATUSES: SkinStatusKey[] = [
  "pending",
  "imposed",
  "printed",
  "cut",
  "shipped",
  "scrap",
];

function startOfDayUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function formatDayLabel(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00Z");
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
}

function buildLast7DayBuckets(): DailyCount[] {
  const buckets: DailyCount[] = [];
  const today = startOfDayUtc(new Date());
  for (let i = 6; i >= 0; i--) {
    const day = new Date(today);
    day.setUTCDate(day.getUTCDate() - i);
    const date = day.toISOString().slice(0, 10);
    buckets.push({
      date,
      label: formatDayLabel(date),
      orders: 0,
      shipped: 0,
    });
  }
  return buckets;
}

export async function fetchAdvancedStats(): Promise<AdvancedStatsPayload> {
  const supabase = createSupabaseAdmin();
  const generatedAt = new Date().toISOString();
  const emptyStatus = Object.fromEntries(
    SKIN_STATUSES.map((s) => [s, 0])
  ) as Record<SkinStatusKey, number>;

  const fallback: AdvancedStatsPayload = {
    generatedAt,
    totals: { orders: 0, skins: 0, lots: 0, sheets: 0 },
    skinsByStatus: emptyStatus,
    ordersLast7Days: buildLast7DayBuckets(),
    scrapBreakdown: SCRAP_REASONS.map((r) => ({
      reason: r.value,
      label: r.label,
      count: 0,
    })),
    inventory: [],
    recentLots: [],
    kpis: {
      shippedRatePct: 0,
      scrapRatePct: 0,
      avgSkinsPerOrder: 0,
      pendingQueue: 0,
      inProduction: 0,
      readyToShip: 0,
    },
  };

  try {
    const since7 = new Date();
    since7.setUTCDate(since7.getUTCDate() - 6);
    since7.setUTCHours(0, 0, 0, 0);
    const sinceIso = since7.toISOString();

    const [
      ordersCount,
      skinsCount,
      lotsCount,
      sheetsCount,
      statusCounts,
      ordersWeek,
      shippedWeek,
      scrapRows,
      inventoryRows,
      recentLotsRows,
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
        .from("skins")
        .select("scrap_reason")
        .eq("status", "scrap"),
      supabase
        .from("inventory")
        .select(
          "id, item_name, current_quantity, unit, alert_threshold"
        )
        .order("item_name"),
      supabase
        .from("lots")
        .select("id, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const skinsByStatus = Object.fromEntries(statusCounts) as Record<
      SkinStatusKey,
      number
    >;

    const ordersLast7Days = buildLast7DayBuckets();
    const orderIndex = new Map(ordersLast7Days.map((d, i) => [d.date, i]));

    for (const row of ordersWeek.data ?? []) {
      const day = row.created_at.slice(0, 10);
      const idx = orderIndex.get(day);
      if (idx !== undefined) ordersLast7Days[idx].orders += 1;
    }

    for (const row of shippedWeek.data ?? []) {
      const day = row.updated_at.slice(0, 10);
      const idx = orderIndex.get(day);
      if (idx !== undefined) ordersLast7Days[idx].shipped += 1;
    }

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

    const inventory = (inventoryRows.data ?? []).map((row) => ({
      id: row.id,
      name: row.item_name,
      current: row.current_quantity,
      threshold: row.alert_threshold,
      unit: row.unit,
      low: row.current_quantity <= row.alert_threshold,
    }));

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
      }));
    }

    const totalOrders = ordersCount.count ?? 0;
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

    return {
      generatedAt,
      totals: {
        orders: totalOrders,
        skins: totalSkins,
        lots: lotsCount.count ?? 0,
        sheets: sheetsCount.count ?? 0,
      },
      skinsByStatus,
      ordersLast7Days,
      scrapBreakdown,
      inventory,
      recentLots,
      kpis: {
        shippedRatePct,
        scrapRatePct,
        avgSkinsPerOrder,
        pendingQueue: skinsByStatus.pending + skinsByStatus.scrap,
        inProduction:
          skinsByStatus.imposed +
          skinsByStatus.printed +
          skinsByStatus.cut,
        readyToShip: skinsByStatus.cut,
      },
    };
  } catch (e) {
    console.error("[stats] fetchAdvancedStats", e);
    return fallback;
  }
}
