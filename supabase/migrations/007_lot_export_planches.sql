-- Drip OS — Export lot, dépôt planches, planche_prete, annulations

-- ---------------------------------------------------------------------------
-- skin_status : planche_prete
-- ---------------------------------------------------------------------------
ALTER TYPE public.skin_status ADD VALUE IF NOT EXISTS 'planche_prete';

-- ---------------------------------------------------------------------------
-- scrap : annulation commande
-- ---------------------------------------------------------------------------
ALTER TYPE public.scrap_reason ADD VALUE IF NOT EXISTS 'annulation';

-- ---------------------------------------------------------------------------
-- lots
-- ---------------------------------------------------------------------------
ALTER TABLE public.lots
  ADD COLUMN IF NOT EXISTS exported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS export_version INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.lots.locked IS 'Figé au premier export — plus de modification du placement';
COMMENT ON COLUMN public.lots.export_version IS 'Incrémenté à chaque export CSV/JSON';

-- ---------------------------------------------------------------------------
-- sheets — fichiers planche
-- ---------------------------------------------------------------------------
ALTER TABLE public.sheets
  ADD COLUMN IF NOT EXISTS file_status TEXT NOT NULL DEFAULT 'attente_fichier',
  ADD COLUMN IF NOT EXISTS file_path TEXT,
  ADD COLUMN IF NOT EXISTS png_path TEXT,
  ADD COLUMN IF NOT EXISTS file_uploaded_at TIMESTAMPTZ;

ALTER TABLE public.sheets
  DROP CONSTRAINT IF EXISTS sheets_file_status_check;

ALTER TABLE public.sheets
  ADD CONSTRAINT sheets_file_status_check
  CHECK (file_status IN ('attente_fichier', 'planche_prete', 'imprimee'));

COMMENT ON COLUMN public.sheets.file_status IS 'Cycle fichier : attente → dépôt → marqué imprimé';

-- ---------------------------------------------------------------------------
-- skins — métadonnées impression + alertes
-- ---------------------------------------------------------------------------
ALTER TABLE public.skins
  ADD COLUMN IF NOT EXISTS visual_url TEXT,
  ADD COLUMN IF NOT EXISTS orientation TEXT,
  ADD COLUMN IF NOT EXISTS framing TEXT,
  ADD COLUMN IF NOT EXISTS product_handle TEXT,
  ADD COLUMN IF NOT EXISTS reprint_of UUID REFERENCES public.skins (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS alert TEXT;

ALTER TABLE public.skins
  DROP CONSTRAINT IF EXISTS skins_orientation_check;

ALTER TABLE public.skins
  ADD CONSTRAINT skins_orientation_check
  CHECK (orientation IS NULL OR orientation IN ('paysage', 'portrait'));

CREATE INDEX IF NOT EXISTS skins_reprint_of_idx
  ON public.skins (reprint_of)
  WHERE reprint_of IS NOT NULL;

CREATE INDEX IF NOT EXISTS skins_alert_idx
  ON public.skins (alert)
  WHERE alert IS NOT NULL;

-- ---------------------------------------------------------------------------
-- lot_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lot_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id      TEXT NOT NULL REFERENCES public.lots (id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id     UUID,
  CONSTRAINT lot_events_type_check CHECK (
    type IN ('export', 'upload', 'alert', 'reprint')
  )
);

CREATE INDEX IF NOT EXISTS lot_events_lot_id_idx ON public.lot_events (lot_id, created_at DESC);

ALTER TABLE public.lot_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read lot_events"
  ON public.lot_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated write lot_events"
  ON public.lot_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- RPC : upload planche (transaction feuille + skins)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upload_planche_sheet(
  p_sheet_id UUID,
  p_file_path TEXT,
  p_png_path TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.sheets
  SET
    file_status = 'planche_prete',
    file_path = p_file_path,
    png_path = p_png_path,
    file_uploaded_at = NOW(),
    updated_at = NOW()
  WHERE id = p_sheet_id;

  UPDATE public.skins
  SET
    status = 'planche_prete',
    updated_at = NOW()
  WHERE sheet_id = p_sheet_id
    AND status = 'imposed';
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_sheet_printed(p_sheet_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.sheets
    WHERE id = p_sheet_id AND file_path IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'missing_file';
  END IF;

  UPDATE public.sheets
  SET
    file_status = 'imprimee',
    status = 'done',
    updated_at = NOW()
  WHERE id = p_sheet_id;

  UPDATE public.skins
  SET
    status = 'printed',
    updated_at = NOW()
  WHERE sheet_id = p_sheet_id
    AND status = 'planche_prete';
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_sheet_after_slot_removal(p_sheet_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.sheets
  SET
    file_status = 'attente_fichier',
    file_path = NULL,
    png_path = NULL,
    file_uploaded_at = NULL,
    updated_at = NOW()
  WHERE id = p_sheet_id
    AND file_status = 'planche_prete';
END;
$$;

-- ---------------------------------------------------------------------------
-- Storage bucket planches (privé)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('planches', 'planches', false, 52428800)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

CREATE POLICY "Authenticated read planches"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'planches');

CREATE POLICY "Authenticated write planches"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'planches')
  WITH CHECK (bucket_id = 'planches');
