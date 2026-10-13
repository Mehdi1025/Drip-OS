-- Liaison skin ↔ feuille A4 (4 emplacements max par sheet)

ALTER TABLE public.sheets
  ADD COLUMN IF NOT EXISTS sheet_index SMALLINT NOT NULL DEFAULT 1;

ALTER TABLE public.skins
  ADD COLUMN IF NOT EXISTS sheet_id UUID REFERENCES public.sheets (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS slot SMALLINT;

ALTER TABLE public.skins
  ADD CONSTRAINT skins_slot_range CHECK (
    slot IS NULL OR (slot >= 1 AND slot <= 4)
  );

CREATE UNIQUE INDEX IF NOT EXISTS skins_sheet_id_slot_unique
  ON public.skins (sheet_id, slot)
  WHERE sheet_id IS NOT NULL;

COMMENT ON COLUMN public.skins.sheet_id IS 'Feuille A4 assignée lors de l''imposition';
COMMENT ON COLUMN public.skins.slot IS 'Emplacement 1–4 sur la feuille';
COMMENT ON COLUMN public.sheets.sheet_index IS 'Numéro de feuille dans le lot (pour track_code F{n})';
