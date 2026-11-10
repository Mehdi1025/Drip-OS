-- Drip OS — Délais & service client (skin_events, claims, SLA)

-- ---------------------------------------------------------------------------
-- orders — champs expédition / promesse
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS placed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ship_country TEXT,
  ADD COLUMN IF NOT EXISTS ship_zip TEXT,
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS carrier TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS tracking_url TEXT,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'inconnu',
  ADD COLUMN IF NOT EXISTS promise_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_delivery_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_delivery_status_check
  CHECK (
    delivery_status IN (
      'en_transit',
      'livre',
      'echec',
      'retour',
      'inconnu'
    )
  );

CREATE INDEX IF NOT EXISTS orders_placed_at_idx ON public.orders (placed_at DESC);
CREATE INDEX IF NOT EXISTS orders_shipped_at_idx ON public.orders (shipped_at DESC);
CREATE INDEX IF NOT EXISTS orders_promise_due_at_idx ON public.orders (promise_due_at);
CREATE INDEX IF NOT EXISTS orders_ship_country_idx ON public.orders (ship_country);

UPDATE public.orders
SET
  placed_at = COALESCE(placed_at, created_at),
  promise_due_at = COALESCE(
    promise_due_at,
    COALESCE(placed_at, created_at) + INTERVAL '48 hours'
  )
WHERE placed_at IS NULL OR promise_due_at IS NULL;

-- ---------------------------------------------------------------------------
-- skins — validation visuel
-- ---------------------------------------------------------------------------
ALTER TABLE public.skins
  ADD COLUMN IF NOT EXISTS visual_status TEXT;

ALTER TABLE public.skins
  DROP CONSTRAINT IF EXISTS skins_visual_status_check;

ALTER TABLE public.skins
  ADD CONSTRAINT skins_visual_status_check
  CHECK (visual_status IS NULL OR visual_status IN ('ok', 'a_valider', 'refuse'));

-- ---------------------------------------------------------------------------
-- skin_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.skin_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skin_id    UUID NOT NULL REFERENCES public.skins (id) ON DELETE CASCADE,
  order_id   UUID NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  from_status TEXT,
  to_status  TEXT NOT NULL,
  at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id    UUID,
  meta       JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS skin_events_skin_id_at_idx
  ON public.skin_events (skin_id, at);

CREATE INDEX IF NOT EXISTS skin_events_order_id_at_idx
  ON public.skin_events (order_id, at);

CREATE OR REPLACE FUNCTION public.log_skin_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.skin_events (skin_id, order_id, from_status, to_status, at)
    VALUES (
      NEW.id,
      NEW.order_id,
      NULL,
      NEW.status::text,
      COALESCE(NEW.created_at, NOW())
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.skin_events (skin_id, order_id, from_status, to_status, at)
    VALUES (
      NEW.id,
      NEW.order_id,
      OLD.status::text,
      NEW.status::text,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS skins_log_status ON public.skins;
CREATE TRIGGER skins_log_status
  AFTER INSERT OR UPDATE OF status ON public.skins
  FOR EACH ROW
  EXECUTE FUNCTION public.log_skin_status_change();

-- Backfill historique (approximatif)
INSERT INTO public.skin_events (skin_id, order_id, from_status, to_status, at, meta)
SELECT
  s.id,
  s.order_id,
  NULL,
  'pending',
  s.created_at,
  '{"backfill":true}'::jsonb
FROM public.skins s
WHERE NOT EXISTS (
  SELECT 1
  FROM public.skin_events e
  WHERE e.skin_id = s.id
    AND e.from_status IS NULL
    AND e.to_status = 'pending'
);

INSERT INTO public.skin_events (skin_id, order_id, from_status, to_status, at, meta)
SELECT
  s.id,
  s.order_id,
  'pending',
  s.status::text,
  s.updated_at,
  '{"backfill":true}'::jsonb
FROM public.skins s
WHERE s.status::text <> 'pending'
  AND NOT EXISTS (
    SELECT 1
    FROM public.skin_events e
    WHERE e.skin_id = s.id
      AND e.to_status = s.status::text
      AND (e.meta->>'backfill')::boolean IS TRUE
  );

-- ---------------------------------------------------------------------------
-- shipment_events (suivi transporteur)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shipment_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  shopify_id   TEXT,
  status       TEXT NOT NULL,
  message      TEXT,
  happened_at  TIMESTAMPTZ NOT NULL,
  raw          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS shipment_events_shopify_id_uidx
  ON public.shipment_events (shopify_id)
  WHERE shopify_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS shipment_events_order_id_idx
  ON public.shipment_events (order_id, happened_at DESC);

-- ---------------------------------------------------------------------------
-- claims (SAV)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.claims (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  skin_id      UUID REFERENCES public.skins (id) ON DELETE SET NULL,
  type         TEXT NOT NULL,
  carrier      TEXT,
  country      TEXT,
  status       TEXT NOT NULL DEFAULT 'ouvert',
  resolution   TEXT,
  cost_eur     NUMERIC(12, 2),
  note         TEXT,
  opened_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ,
  user_id      UUID,
  CONSTRAINT claims_type_check CHECK (
    type IN ('perdu', 'abime', 'retour', 'non_conforme', 'autre')
  ),
  CONSTRAINT claims_status_check CHECK (
    status IN ('ouvert', 'en_cours', 'resolu')
  ),
  CONSTRAINT claims_resolution_check CHECK (
    resolution IS NULL
    OR resolution IN ('reimpression', 'remboursement', 'renvoi', 'aucun')
  )
);

CREATE INDEX IF NOT EXISTS claims_carrier_opened_idx
  ON public.claims (carrier, opened_at DESC);

CREATE INDEX IF NOT EXISTS claims_order_id_idx ON public.claims (order_id);

-- ---------------------------------------------------------------------------
-- RPC : expédition complète commande
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_order_shipped_at(p_order_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_active INT;
  v_shipped INT;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE status <> 'scrap'),
    COUNT(*) FILTER (WHERE status = 'shipped')
  INTO v_active, v_shipped
  FROM public.skins
  WHERE order_id = p_order_id;

  IF v_active > 0 AND v_active = v_shipped THEN
    UPDATE public.orders
    SET shipped_at = COALESCE(shipped_at, NOW())
    WHERE id = p_order_id;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- RLS (lecture authentifiée)
-- ---------------------------------------------------------------------------
ALTER TABLE public.skin_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read skin_events"
  ON public.skin_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read shipment_events"
  ON public.shipment_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read claims"
  ON public.claims FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated write claims"
  ON public.claims FOR ALL TO authenticated USING (true) WITH CHECK (true);
