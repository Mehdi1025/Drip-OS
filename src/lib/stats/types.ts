import type { InventoryCategory } from "@/lib/inventory/categories";

export type SkinStatusKey =
  | "pending"
  | "imposed"
  | "planche_prete"
  | "printed"
  | "cut"
  | "shipped"
  | "scrap";

export type DailyCount = {
  date: string;
  label: string;
  orders: number;
  shipped: number;
  lots: number;
  sheets: number;
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
  category: InventoryCategory;
  daysUntilThreshold: number | null;
};

export type InventoryCategoryHealth = {
  id: InventoryCategory;
  title: string;
  itemCount: number;
  alertCount: number;
};

export type RecentLotStat = {
  lotId: string;
  createdAt: string;
  skinCount: number;
  sheetCount: number;
};

export type ShippingMethodStat = {
  method: string;
  count: number;
};

export type RecentOrderStat = {
  id: string;
  shopifyId: number;
  customerName: string;
  shippingMethod: string;
  createdAt: string;
  skinCount: number;
  shippedCount: number;
  inProgressCount: number;
  scrapCount: number;
};

export type PeriodMetric = {
  orders: number;
  shipped: number;
  lots: number;
  sheets: number;
  scrap: number;
};

export type PeriodComparison = {
  last7: PeriodMetric;
  prev7: PeriodMetric;
  deltas: {
    orders: number | null;
    shipped: number | null;
    lots: number | null;
    sheets: number | null;
  };
};

export type ProductionHealth = {
  oldestPendingAgeHours: number | null;
  skinsPerSheet: number;
  ordersAwaitingShipment: number;
  fillRatePct: number;
  sheetsWithoutFileOver12h: number;
  pendingOver24h: number;
  reprintsLast7Days: number;
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
  dailySeries: DailyCount[];
  scrapBreakdown: ScrapBreakdown[];
  inventory: InventoryStatRow[];
  inventoryByCategory: InventoryCategoryHealth[];
  inventoryAlertCount: number;
  recentLots: RecentLotStat[];
  recentOrders: RecentOrderStat[];
  shippingMethods: ShippingMethodStat[];
  periodComparison: PeriodComparison;
  production: ProductionHealth;
  kpis: {
    shippedRatePct: number;
    scrapRatePct: number;
    avgSkinsPerOrder: number;
    pendingQueue: number;
    inProduction: number;
    readyToShip: number;
    throughput7d: PeriodMetric;
  };
};
