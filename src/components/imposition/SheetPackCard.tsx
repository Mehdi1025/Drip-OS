import type { PendingSkin } from "@/lib/imposition/types";

type Props = {
  sheetNumber: number;
  skins: PendingSkin[];
};

const SLOTS = [1, 2, 3, 4] as const;

export function SheetPackCard({ sheetNumber, skins }: Props) {
  const bySlot = SLOTS.map((slot) => skins[slot - 1] ?? null);

  return (
    <article className="max-w-full border-4 border-[#0a0a0a] bg-[#f2ede4] shadow-brutal-sm sm:shadow-brutal">
      <header className="flex items-center justify-between border-b-4 border-[#0a0a0a] bg-[#ccff00] px-4 py-2">
        <span className="text-xs font-black uppercase tracking-widest text-[#0a0a0a]">
          Feuille
        </span>
        <span className="font-mono text-lg font-black text-[#0a0a0a]">
          F{sheetNumber}
        </span>
      </header>

      <div className="grid grid-cols-2 gap-0">
        {bySlot.map((skin, index) => (
          <div
            key={slotKey(sheetNumber, index)}
            className="min-h-[120px] border-b-4 border-r-4 border-[#0a0a0a] p-3 last:border-b-0 odd:border-r-4 [&:nth-child(2)]:border-r-0 [&:nth-child(4)]:border-r-0 [&:nth-child(3)]:border-b-0 [&:nth-child(4)]:border-b-0"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="rounded-sm border-2 border-[#0a0a0a] bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold">
                S{index + 1}
              </span>
              {skin ? (
                <span className="h-2 w-2 rounded-full bg-[#ccff00] ring-2 ring-[#0a0a0a]" />
              ) : (
                <span className="h-2 w-2 rounded-full border-2 border-[#0a0a0a] bg-transparent" />
              )}
            </div>

            {skin ? (
              <>
                <p className="line-clamp-2 text-sm font-bold leading-tight text-[#0a0a0a]">
                  {skin.design_name}
                </p>
                <p className="mt-1 truncate font-mono text-[10px] text-[#0a0a0a]/70">
                  {skin.track_code}
                </p>
                <p className="mt-1 truncate text-[10px] font-medium uppercase text-[#0a0a0a]/60">
                  {skin.customer_name}
                </p>
              </>
            ) : (
              <p className="text-xs font-bold uppercase tracking-wide text-[#0a0a0a]/35">
                Vide
              </p>
            )}
          </div>
        ))}
      </div>
    </article>
  );
}

function slotKey(sheetNumber: number, index: number) {
  return `sheet-${sheetNumber}-slot-${index}`;
}
