-- Drip OS — Smart Restock (inventaire ERP)
-- Consommation liée à la production : usage_per_sheet × nombre de feuilles générées

-- ---------------------------------------------------------------------------
-- inventory
-- ---------------------------------------------------------------------------
CREATE TABLE public.inventory (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name         VARCHAR(120) NOT NULL,
  current_quantity  DOUBLE PRECISION NOT NULL DEFAULT 0,
  unit              VARCHAR(40) NOT NULL,
  alert_threshold   DOUBLE PRECISION NOT NULL,
  usage_per_sheet   DOUBLE PRECISION NOT NULL DEFAULT 0,
  supplier_url      VARCHAR(2048),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT inventory_item_name_unique UNIQUE (item_name),
  CONSTRAINT inventory_current_quantity_nonneg CHECK (current_quantity >= 0),
  CONSTRAINT inventory_alert_threshold_nonneg CHECK (alert_threshold >= 0),
  CONSTRAINT inventory_usage_per_sheet_nonneg CHECK (usage_per_sheet >= 0)
);

COMMENT ON TABLE public.inventory IS 'Stock consommables atelier — module Smart Restock.';
COMMENT ON COLUMN public.inventory.usage_per_sheet IS 'Consommation par feuille A4 imposée (ex. 1 feuille vinyle, 29.7 cm lamination).';
COMMENT ON COLUMN public.inventory.alert_threshold IS 'Seuil critique : alerte si current_quantity <= alert_threshold.';

CREATE INDEX inventory_low_stock_idx
  ON public.inventory (current_quantity, alert_threshold);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
CREATE TRIGGER inventory_set_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS (aligné sur le reste de Drip OS)
-- ---------------------------------------------------------------------------
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read inventory"
  ON public.inventory FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated write inventory"
  ON public.inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Données de test Smart Restock
-- ---------------------------------------------------------------------------
INSERT INTO public.inventory (
  item_name,
  current_quantity,
  unit,
  alert_threshold,
  usage_per_sheet,
  supplier_url
) VALUES
  (
    'Vinyle A4',
    480,
    'feuilles',
    120,
    1,
    'https://example.com/fournisseur/vinyle-a4'
  ),
  (
    'Lamination',
    9200,
    'cm',
    2500,
    29.7,
    'https://example.com/fournisseur/lamination-roll'
  ),
  (
    'Enveloppes C5',
    340,
    'unités',
    75,
    0,
    'https://example.com/fournisseur/enveloppes-c5'
  )
ON CONFLICT (item_name) DO NOTHING;
