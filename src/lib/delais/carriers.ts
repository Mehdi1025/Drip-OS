const CARRIER_ALIASES: [RegExp, string][] = [
  [/colissimo|la\s*poste|laposte/i, "Colissimo"],
  [/mondial\s*relay/i, "Mondial Relay"],
  [/chronopost/i, "Chronopost"],
  [/dhl/i, "DHL"],
  [/ups/i, "UPS"],
  [/relais\s*colis|relaiscolis/i, "Mondial Relay"],
  [/gls/i, "GLS"],
  [/fedex/i, "FedEx"],
];

/** Normalise le nom transporteur Shopify → libellé atelier. */
export function normalizeCarrierName(raw: string | null | undefined): string {
  const value = raw?.trim();
  if (!value) return "Autre";
  for (const [re, label] of CARRIER_ALIASES) {
    if (re.test(value)) return label;
  }
  if (/poste/i.test(value)) return "La Poste";
  return value.length > 32 ? `${value.slice(0, 29)}…` : value;
}
