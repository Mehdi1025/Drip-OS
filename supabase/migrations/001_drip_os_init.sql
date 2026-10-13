-- Drip OS — Initial schema (Supabase / PostgreSQL)
-- Run in SQL Editor or via Supabase CLI: supabase db push

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE public.skin_status AS ENUM (
  'pending',
  'imposed',
  'printed',
  'cut',
  'shipped',
  'scrap'
);

CREATE TYPE public.sheet_status AS ENUM (
  'generating',
  'ready',
  'printed',
  'done'
);

-- ---------------------------------------------------------------------------
-- lots (must exist before sheets)
-- id format example: L-261013-01
-- ---------------------------------------------------------------------------
CREATE TABLE public.lots (
  id          TEXT PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lots_id_format CHECK (id ~ '^L-[0-9]{6}-[0-9]{2}$')
);

COMMENT ON TABLE public.lots IS 'Groupement de feuilles A4 pour une session d''impression.';
COMMENT ON COLUMN public.lots.id IS 'Identifiant lisible, ex. L-261013-01';

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
CREATE TABLE public.orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_shopify       BIGINT NOT NULL,
  customer_name    TEXT NOT NULL,
  shipping_method  TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT orders_id_shopify_unique UNIQUE (id_shopify)
);

COMMENT ON TABLE public.orders IS 'Commandes Shopify synchronisées.';
CREATE INDEX orders_created_at_idx ON public.orders (created_at DESC);

-- ---------------------------------------------------------------------------
-- skins (line item physique)
-- ---------------------------------------------------------------------------
CREATE TABLE public.skins (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  design_name  TEXT NOT NULL,
  status       public.skin_status NOT NULL DEFAULT 'pending',
  track_code   TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT skins_track_code_unique UNIQUE (track_code),
  CONSTRAINT skins_track_code_format CHECK (track_code ~ '^[0-9]+-F[0-9]+-S[0-9]+$')
);

COMMENT ON TABLE public.skins IS 'Unité physique à produire (line item).';
COMMENT ON COLUMN public.skins.track_code IS 'Traçabilité atelier, ex. 1042-F1-S1';

CREATE INDEX skins_order_id_idx ON public.skins (order_id);
CREATE INDEX skins_status_idx ON public.skins (status);
CREATE INDEX skins_track_code_idx ON public.skins (track_code);

-- ---------------------------------------------------------------------------
-- sheets (feuilles A4)
-- ---------------------------------------------------------------------------
CREATE TABLE public.sheets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id      TEXT NOT NULL REFERENCES public.lots (id) ON DELETE RESTRICT,
  status      public.sheet_status NOT NULL DEFAULT 'generating',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.sheets IS 'Feuille A4 dans un lot d''imposition.';

CREATE INDEX sheets_lot_id_idx ON public.sheets (lot_id);
CREATE INDEX sheets_status_idx ON public.sheets (status);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER skins_set_updated_at
  BEFORE UPDATE ON public.skins
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER sheets_set_updated_at
  BEFORE UPDATE ON public.sheets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security (à affiner selon auth Supabase)
-- ---------------------------------------------------------------------------
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheets ENABLE ROW LEVEL SECURITY;

-- Politiques permissives pour app interne authentifiée (service role bypass RLS)
CREATE POLICY "Authenticated read lots"
  ON public.lots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write lots"
  ON public.lots FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read orders"
  ON public.orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write orders"
  ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read skins"
  ON public.skins FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write skins"
  ON public.skins FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read sheets"
  ON public.sheets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write sheets"
  ON public.sheets FOR ALL TO authenticated USING (true) WITH CHECK (true);
