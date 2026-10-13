CREATE TYPE public.scrap_reason AS ENUM (
  'bulle',
  'mauvaise_coupe',
  'puce_ratee'
);

ALTER TABLE public.skins
  ADD COLUMN IF NOT EXISTS scrap_reason public.scrap_reason;

COMMENT ON COLUMN public.skins.scrap_reason IS 'Cause du rebut atelier (workshop)';
