/** Identifiant lot : L-YYMMDD-NN */
export function formatLotId(date: Date, sequence: number): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const seq = String(sequence).padStart(2, "0");
  return `L-${yy}${mm}${dd}-${seq}`;
}

export function lotIdPrefixForDate(date: Date): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `L-${yy}${mm}${dd}-`;
}

export function nextSequenceFromLotIds(ids: string[], prefix: string): number {
  let max = 0;
  for (const id of ids) {
    if (!id.startsWith(prefix)) continue;
    const suffix = id.slice(prefix.length);
    const n = parseInt(suffix, 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return max + 1;
}
