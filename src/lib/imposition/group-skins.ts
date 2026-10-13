import { SKINS_PER_SHEET } from "@/lib/imposition/constants";

export function chunkSkins<T>(items: T[], size = SKINS_PER_SHEET): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
