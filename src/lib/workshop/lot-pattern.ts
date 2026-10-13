const LOT_ID_REGEX = /^L-[0-9]{6}-[0-9]{2}$/;

export function normalizeLotId(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidLotId(lotId: string): boolean {
  return LOT_ID_REGEX.test(normalizeLotId(lotId));
}
