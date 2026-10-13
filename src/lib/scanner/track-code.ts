/** Normalise la valeur lue (scan manuel ou caméra). */
export function normalizeTrackCode(raw: string): string {
  return raw.trim();
}

const TRACK_CODE_PATTERN = /^\d+-F\d+-S\d+$/;

export function isLikelyTrackCode(value: string): boolean {
  return TRACK_CODE_PATTERN.test(normalizeTrackCode(value));
}

/** ID commande Shopify (souvent 13+ chiffres, ex. 18945694761245). */
export function parseShopifyOrderIdFromScan(raw: string): string | null {
  const value = normalizeTrackCode(raw);
  if (!value || isLikelyTrackCode(value)) return null;
  if (!/^\d+$/.test(value)) return null;
  if (value.length < 10) return null;
  return value;
}
