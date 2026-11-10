export const SCRAP_REASONS = [
  { value: "bulle", label: "Bulle" },
  { value: "mauvaise_coupe", label: "Mauvaise Coupe" },
  { value: "puce_ratee", label: "Puce ratée" },
] as const;

/** Causes atelier (hors annulation système). */
export type ScrapReasonValue = (typeof SCRAP_REASONS)[number]["value"];

export type ScrapReasonDb = ScrapReasonValue | "annulation";

export function isScrapReason(value: string): value is ScrapReasonValue {
  return SCRAP_REASONS.some((r) => r.value === value);
}

export function isProductionScrapReason(value: string): boolean {
  return isScrapReason(value);
}
