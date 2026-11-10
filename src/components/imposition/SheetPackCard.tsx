import type { PendingSkin } from "@/lib/imposition/types";

type Props = {
  sheetNumber: number;
  skins: PendingSkin[];
};

const SLOTS = [1, 2, 3, 4] as const;

export function SheetPackCard({ sheetNumber, skins }: Props) {
  const bySlot = SLOTS.map((slot) => skins[slot - 1] ?? null);

  return (
    <article className="drip-card max-w-full overflow-hidden">
      <header className="flex items-center justify-between border-b border-drip-border bg-drip-lilac px-4 py-3">
        <span className="text-[11px] font-medium uppercase tracking-widest text-drip-muted">
          Feuille
        </span>
        <span className="font-mono text-lg font-semibold text-drip-volt">
          F{sheetNumber}
        </span>
      </header>

      <div className="grid grid-cols-2 gap-px bg-drip-border">
        {bySlot.map((skin, index) => (
          <div
            key={slotKey(sheetNumber, index)}
            className="min-h-[124px] bg-drip-paper p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="drip-chip py-0.5 text-[10px]">S{index + 1}</span>
              {skin ? (
                <span className="h-2 w-2 rounded-full bg-drip-success shadow-[0_0_8px_rgba(74,222,128,0.55)]" />
              ) : (
                <span className="h-2 w-2 rounded-full border border-drip-border" />
              )}
            </div>

            {skin ? (
              <>
                <p className="line-clamp-2 text-sm font-medium leading-tight">
                  {skin.design_name}
                  {skin.urgent ? (
                    <span className="ml-1.5 rounded bg-red-500/20 px-1 py-0.5 text-[9px] font-bold uppercase text-red-800">
                      Urgent
                    </span>
                  ) : null}
                  {skin.reprint_of ? (
                    <span className="ml-1.5 rounded bg-drip-peach/30 px-1 py-0.5 text-[9px] font-bold uppercase">
                      Réimp.
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 truncate font-mono text-[10px] text-drip-muted">
                  {skin.track_code}
                </p>
                <p className="mt-1 truncate text-[10px] text-drip-muted">
                  {skin.customer_name}
                </p>
              </>
            ) : (
              <p className="text-xs text-drip-muted/70">Emplacement vide</p>
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
