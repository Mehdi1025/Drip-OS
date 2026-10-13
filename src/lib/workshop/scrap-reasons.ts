export const SCRAP_REASONS = [
  { value: "bulle", label: "Bulle" },
  { value: "mauvaise_coupe", label: "Mauvaise Coupe" },
  { value: "puce_ratee", label: "Puce ratée" },
] as const;

export type ScrapReasonValue = (typeof SCRAP_REASONS)[number]["value"];

export function isScrapReason(value: string): value is ScrapReasonValue {
  return SCRAP_REASONS.some((r) => r.value === value);
}
