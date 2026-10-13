export type SkinStatusKey =
  | "pending"
  | "imposed"
  | "printed"
  | "cut"
  | "shipped"
  | "scrap";

export type DailyCount = {
  date: string;
  label: string;
  orders: number;
  shipped: number;
};

export type ScrapBreakdown = {
  reason: string;
  label: string;
  count: number;
};

export type InventoryStatRow = {
  id: string;
  name: string;
  current: number;
  threshold: number;
  unit: string;
  low: boolean;
};

export type RecentLotStat = {
  lotId: string;
  createdAt: string;
  skinCount: number;
};

export type AdvancedStatsPayload = {
  generatedAt: string;
  totals: {
    orders: number;
    skins: number;
    lots: number;
    sheets: number;
  };
  skinsByStatus: Record<SkinStatusKey, number>;
  ordersLast7Days: DailyCount[];
  scrapBreakdown: ScrapBreakdown[];
  inventory: InventoryStatRow[];
  recentLots: RecentLotStat[];
  kpis: {
    shippedRatePct: number;
    scrapRatePct: number;
    avgSkinsPerOrder: number;
    pendingQueue: number;
    inProduction: number;
    readyToShip: number;
  };
};
