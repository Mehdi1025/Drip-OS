/** Normalise la valeur lue (scan manuel ou caméra). */
export function normalizeTrackCode(raw: string): string {
  return raw.trim();
}

const TRACK_CODE_PATTERN = /^\d+-F\d+-S\d+$/;

export function isLikelyTrackCode(value: string): boolean {
  return TRACK_CODE_PATTERN.test(normalizeTrackCode(value));
}
