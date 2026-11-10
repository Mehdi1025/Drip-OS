const TRACK_FROM_URL = /(\d+-F\d+-S\d+)\s*$/i;

/** Normalise la valeur lue (scan manuel, caméra ou URL avec track code en fin). */
export function normalizeTrackCode(raw: string): string {
  const trimmed = raw.trim();
  const fromUrl = trimmed.match(TRACK_FROM_URL);
  if (fromUrl?.[1]) return fromUrl[1];
  return trimmed;
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
