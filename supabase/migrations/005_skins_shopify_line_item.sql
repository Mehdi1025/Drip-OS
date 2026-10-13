-- Lien skin ↔ line_item Shopify pour fulfillments partiels à l'expédition scanner
ALTER TABLE public.skins
  ADD COLUMN IF NOT EXISTS shopify_line_item_id BIGINT;

COMMENT ON COLUMN public.skins.shopify_line_item_id IS
  'ID line_item Shopify (webhook orders/create) pour créer un fulfillment à l''expédition.';

CREATE INDEX IF NOT EXISTS skins_shopify_line_item_id_idx
  ON public.skins (shopify_line_item_id)
  WHERE shopify_line_item_id IS NOT NULL;
