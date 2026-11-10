export type DelaisPeriodDays = 7 | 30 | 90;

export type BlockageReason =
  | "visuel_a_valider"
  | "stock_manquant"
  | "rebut_a_refaire"
  | "pas_encore_impose"
  | "planche_manquante"
  | "alerte";

export type OrderRiskRow = {
  orderId: string;
  idShopify: number;
  customerName: string;
  country: string | null;
  shippingMethod: string;
  promiseDueAt: string;
  placedAt: string;
  hoursToDue: number;
  overdue: boolean;
  atRisk: boolean;
  urgencyScore: number;
  reasons: BlockageReason[];
  lotId: string | null;
  skins: {
    id: string;
    trackCode: string;
    status: string;
    designName: string;
  }[];
};

export type ShippingSlaStats = {
  medianHours: number | null;
  p90Hours: number | null;
  meanHours: number | null;
  pctUnder48: number | null;
  sampleSize: number;
};

export type StageMedianHours = {
  status: string;
  label: string;
  medianHours: number;
};

export type WeeklySlaPoint = {
  weekLabel: string;
  weekStart: string;
  medianHours: number | null;
  p90Hours: number | null;
};

export type CarrierCountryCell = {
  carrier: string;
  country: string;
  count: number;
  medianDays: number | null;
  p90Days: number | null;
  pctUnder3Days: number | null;
  pctUnknown: number | null;
  recommended: boolean;
};

export type ClaimRow = {
  id: string;
  orderId: string;
  idShopify: number;
  type: string;
  carrier: string | null;
  country: string | null;
  status: string;
  resolution: string | null;
  costEur: number | null;
  note: string | null;
  openedAt: string;
  resolvedAt: string | null;
};

export type CarrierClaimRates = {
  carrier: string;
  shipped: number;
  lost: number;
  damaged: number;
  returned: number;
  totalClaims: number;
  claimRatePct: number;
  costEur: number;
};

export type DelaisDashboardPayload = {
  generatedAt: string;
  periodDays: DelaisPeriodDays;
  promiseHours: number;
  sla: ShippingSlaStats;
  weeklySla: WeeklySlaPoint[];
  stageMedians: StageMedianHours[];
  persoMedianHours: number | null;
  catalogMedianHours: number | null;
  overdueCount: number;
  atRiskCount: number;
  openClaimsCount: number;
  globalClaimRatePct: number | null;
  actionQueue: OrderRiskRow[];
  carrierMatrix: CarrierCountryCell[];
  countryRecommendations: { country: string; carrier: string; sample: number }[];
  staleTracking: {
    orderId: string;
    idShopify: number;
    trackingUrl: string | null;
    trackingNumber: string | null;
    shippedAt: string;
    carrier: string | null;
  }[];
  carrierClaims: CarrierClaimRates[];
  openClaims: ClaimRow[];
};
