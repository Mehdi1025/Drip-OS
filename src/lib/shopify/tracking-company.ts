/**
 * Nom transporteur pour Shopify (tracking_info.company).
 * Proche des choix Admin « Marquer comme expédié ».
 */
export function resolveTrackingCompanyFromShippingMethod(
  shippingMethod: string | null | undefined
): string {
  const fromEnv = process.env.SHOPIFY_DEFAULT_TRACKING_COMPANY?.trim();
  if (fromEnv) return fromEnv.slice(0, 255);

  const raw = (shippingMethod ?? "").trim().toLowerCase();
  if (!raw) return "Other";

  if (raw.includes("colissimo")) return "Colissimo";
  if (raw.includes("chronopost")) return "Chronopost";
  if (raw.includes("mondial relay")) return "Mondial Relay";
  if (raw.includes("ups")) return "UPS";
  if (raw.includes("dhl")) return "DHL";
  if (raw.includes("fedex")) return "FedEx";
  if (raw.includes("laposte") || raw.includes("la poste")) return "La Poste";
  if (raw.includes("relais") || raw.includes("pickup")) return "Other";
  if (raw.includes("lettre") || raw.includes("suivi")) return "La Poste";

  const titleCase = shippingMethod!.trim().slice(0, 255);
  return titleCase || "Other";
}
