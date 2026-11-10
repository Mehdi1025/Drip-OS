const TRACK_FROM_URL = /(\d+-[fF]\d+-[sS]\d+)\s*$/i;
const TRACK_DIRECT = /^(\d+)-([fF])(\d+)-([sS])(\d+)$/;

function canonicalTrackCode(match: RegExpMatchArray): string {
  return `${match[1]}-F${match[3]}-S${match[5]}`;
}

function normalizeTrackShape(value: string): string | null {
  const direct = value.match(TRACK_DIRECT);
  if (direct) return canonicalTrackCode(direct);
  const fromTail = value.match(TRACK_FROM_URL);
  if (fromTail?.[1]) {
    const inner = fromTail[1].match(TRACK_DIRECT);
    if (inner) return canonicalTrackCode(inner);
  }
  return null;
}

/** Normalise la valeur lue (scan manuel, caméra ou URL avec track code en fin). */
export function normalizeTrackCode(raw: string): string {
  let trimmed = raw.trim().replace(/^\uFEFF/, "");
  const shaped = normalizeTrackShape(trimmed);
  if (shaped) return shaped;

  if (/^#\d+/.test(trimmed)) {
    trimmed = trimmed.replace(/^#/, "").trim();
  }

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

/**
 * Préfixe du track code (order_number Shopify), ex. 1015 → skins 1015-F1-S1.
 * Pas le #8792 affiché sur certaines commandes.
 */
export function parseOrderTrackPrefixFromScan(raw: string): string | null {
  const value = normalizeTrackCode(raw);
  if (!value || isLikelyTrackCode(value)) return null;
  if (!/^\d+$/.test(value)) return null;
  if (value.length >= 10) return null;
  if (value.length < 3) return null;
  return value;
}
