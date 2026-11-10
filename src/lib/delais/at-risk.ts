import {
  MISSING_PLANCHE_HOURS,
  PENDING_IMPOSE_SLA_HOURS,
  PROMISE_HOURS,
  RISK_HOURS,
} from "@/lib/delais/config";
import type { BlockageReason, OrderRiskRow } from "@/lib/delais/types";

export type { BlockageReason };

export const BLOCKAGE_LABELS: Record<BlockageReason, string> = {
  visuel_a_valider: "Visuel à valider",
  stock_manquant: "Stock manquant",
  rebut_a_refaire: "Rebut à refaire",
  pas_encore_impose: "Pas encore imposé",
  planche_manquante: "Planche manquante",
  alerte: "Alerte",
};

type SkinCtx = {
  id: string;
  trackCode: string;
  status: string;
  designName: string;
  visualUrl: string | null;
  visualStatus: string | null;
  alert: string | null;
  reprintOf: string | null;
  sheetId: string | null;
  createdAt: string;
};

type SheetCtx = {
  id: string;
  fileStatus: string;
  lotId: string;
  updatedAt: string;
};

type OrderCtx = {
  id: string;
  idShopify: number;
  customerName: string;
  country: string | null;
  shippingMethod: string;
  placedAt: string;
  promiseDueAt: string;
  cancelledAt: string | null;
  skins: SkinCtx[];
};

type StockLow = boolean;

function isPersoSkin(s: SkinCtx): boolean {
  return Boolean(s.visualUrl?.trim());
}

function hasOpenReprint(scrapIds: Set<string>, skins: SkinCtx[]): boolean {
  for (const scrapId of Array.from(scrapIds)) {
    const replacement = skins.find(
      (s) => s.reprintOf === scrapId && s.status !== "scrap"
    );
    if (!replacement) return true;
    if (replacement.status !== "cut" && replacement.status !== "shipped") {
      return true;
    }
  }
  return false;
}

export function computeOrderBlockers(
  order: OrderCtx,
  sheetById: Map<string, SheetCtx>,
  stockLow: StockLow,
  now = Date.now()
): BlockageReason[] {
  const reasons: BlockageReason[] = [];
  const active = order.skins.filter((s) => s.status !== "scrap");
  if (active.length === 0) return reasons;

  const placedMs = new Date(order.placedAt).getTime();

  for (const s of active) {
    if (isPersoSkin(s) && (!s.visualUrl || s.visualStatus === "a_valider")) {
      if (!reasons.includes("visuel_a_valider")) reasons.push("visuel_a_valider");
    }
    if (s.alert) {
      if (!reasons.includes("alerte")) reasons.push("alerte");
    }
    if (
      s.status === "pending" &&
      now - placedMs > PENDING_IMPOSE_SLA_HOURS * 3600_000
    ) {
      if (!reasons.includes("pas_encore_impose")) {
        reasons.push("pas_encore_impose");
      }
    }
    if (s.sheetId) {
      const sheet = sheetById.get(s.sheetId);
      if (
        sheet?.fileStatus === "attente_fichier" &&
        now - new Date(sheet.updatedAt).getTime() >
          MISSING_PLANCHE_HOURS * 3600_000
      ) {
        if (!reasons.includes("planche_manquante")) {
          reasons.push("planche_manquante");
        }
      }
    }
  }

  const scrapIds = new Set(
    order.skins.filter((s) => s.status === "scrap").map((s) => s.id)
  );
  if (scrapIds.size > 0 && hasOpenReprint(scrapIds, order.skins)) {
    reasons.push("rebut_a_refaire");
  }

  if (stockLow && !reasons.includes("stock_manquant")) {
    reasons.push("stock_manquant");
  }

  return reasons;
}

export function orderIsOpen(order: OrderCtx): boolean {
  if (order.cancelledAt) return false;
  const active = order.skins.filter((s) => s.status !== "scrap");
  if (active.length === 0) return false;
  return active.some((s) => s.status !== "shipped");
}

export function buildOrderRiskRow(
  order: OrderCtx,
  sheetById: Map<string, SheetCtx>,
  stockLow: StockLow,
  now = Date.now()
): OrderRiskRow | null {
  if (!orderIsOpen(order)) return null;

  const promiseMs = new Date(order.promiseDueAt).getTime();
  const hoursToDue = (promiseMs - now) / 3600_000;
  const overdue = hoursToDue < 0;

  const reasons = computeOrderBlockers(order, sheetById, stockLow, now);
  const notAllCut = order.skins
    .filter((s) => s.status !== "scrap")
    .some((s) => s.status !== "cut" && s.status !== "shipped");

  const atRisk =
    overdue ||
    (hoursToDue <= RISK_HOURS && notAllCut) ||
    reasons.length > 0;

  if (!overdue && !atRisk && reasons.length === 0 && hoursToDue > RISK_HOURS) {
    return null;
  }

  let lotId: string | null = null;
  for (const s of order.skins) {
    if (s.sheetId) {
      const sh = sheetById.get(s.sheetId);
      if (sh) {
        lotId = sh.lotId;
        break;
      }
    }
  }

  const urgencyScore =
    (overdue ? -hoursToDue * 10 : hoursToDue) +
    reasons.length * 25 +
    (hoursToDue < PROMISE_HOURS / 4 ? 15 : 0);

  return {
    orderId: order.id,
    idShopify: order.idShopify,
    customerName: order.customerName,
    country: order.country,
    shippingMethod: order.shippingMethod,
    promiseDueAt: order.promiseDueAt,
    placedAt: order.placedAt,
    hoursToDue,
    overdue,
    atRisk,
    urgencyScore,
    reasons,
    lotId,
    skins: order.skins
      .filter((s) => s.status !== "scrap")
      .map((s) => ({
        id: s.id,
        trackCode: s.trackCode,
        status: s.status,
        designName: s.designName,
      })),
  };
}
