import { isValidLotId, normalizeLotId } from "@/lib/workshop/lot-pattern";

/** `F1`, `F2`… depuis sheet_index */
export function sheetCodeFromIndex(sheetIndex: number): string {
  return `F${sheetIndex}`;
}

export function parseSheetCodeFromFilename(
  filename: string,
  lotId?: string
): string | null {
  const base = filename.replace(/\\/g, "/").split("/").pop() ?? filename;
  const name = base.replace(/\.[^.]+$/, "");

  const normalizedLot = lotId ? normalizeLotId(lotId) : null;

  const patterns = [
    normalizedLot
      ? new RegExp(`^${escapeRegex(normalizedLot)}[_-](F\\d+)`, "i")
      : null,
    /[_-](F\d+)(?:[_-]|$)/i,
    /^(F\d+)$/i,
    /(F\d+)_impression$/i,
  ].filter(Boolean) as RegExp[];

  for (const re of patterns) {
    const m = name.match(re);
    if (m?.[1]) {
      return m[1].toUpperCase().replace(/^F/, "F").replace(/^f/, "F");
    }
  }

  const simple = name.match(/(F\d+)/i);
  if (simple?.[1]) {
    return `F${simple[1].slice(1)}`.replace(/^FF/, "F");
  }

  return null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function storageObjectPath(
  lotId: string,
  sheetCode: string,
  ext: "pdf" | "png"
): string {
  const lot = normalizeLotId(lotId);
  return `${lot}/${sheetCode}.${ext}`;
}

export function assertLotIdParam(raw: string): string | null {
  const id = normalizeLotId(raw);
  return isValidLotId(id) ? id : null;
}
