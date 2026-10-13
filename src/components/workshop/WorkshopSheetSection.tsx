import type { WorkshopSheet } from "@/lib/workshop/types";
import { SkinWorkshopCard } from "@/components/workshop/SkinWorkshopCard";

type Props = {
  sheet: WorkshopSheet;
  busySkinId: string | null;
  onOk: (skinId: string) => void;
  onScrap: (skin: { id: string; design_name: string; track_code: string }) => void;
};

export function WorkshopSheetSection({ sheet, busySkinId, onOk, onScrap }: Props) {
  const filled = sheet.slots.filter(Boolean).length;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-4 border-[#0a0a0a] bg-[#0a0a0a] px-4 py-3 text-[#f2ede4] shadow-[6px_6px_0_0_#ccff00]">
        <h3 className="text-lg font-black uppercase tracking-wide">
          Feuille F{sheet.sheetIndex}
        </h3>
        <span className="font-mono text-sm font-bold">
          {filled}/4 skins · {sheet.status}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {sheet.slots.map((skin, index) => {
          const slotLabel = `S${index + 1}`;

          if (!skin) {
            return (
              <div
                key={`${sheet.id}-empty-${index}`}
                className="flex min-h-[200px] items-center justify-center border-4 border-dashed border-[#0a0a0a]/25 bg-white/40"
              >
                <span className="text-sm font-black uppercase text-[#0a0a0a]/30">
                  {slotLabel} — vide
                </span>
              </div>
            );
          }

          return (
            <SkinWorkshopCard
              key={skin.id}
              skin={skin}
              slotLabel={slotLabel}
              disabled={busySkinId === skin.id}
              onOk={() => onOk(skin.id)}
              onScrap={() =>
                onScrap({
                  id: skin.id,
                  design_name: skin.design_name,
                  track_code: skin.track_code,
                })
              }
            />
          );
        })}
      </div>
    </section>
  );
}
