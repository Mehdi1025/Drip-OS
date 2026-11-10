-- DripMyCard — nomenclature atelier (fabrication, kit client, expédition)
-- usage_per_sheet × feuilles A4 au « Générer un lot » ; articles « par commande » × commandes du lot

-- Renommer les lignes de démo 004 si présentes
UPDATE public.inventory
SET item_name = 'Vinyle adhésif imprimable A4'
WHERE item_name = 'Vinyle A4';

UPDATE public.inventory
SET
  item_name = 'Film lamination à froid A4',
  unit = 'feuilles',
  usage_per_sheet = 1
WHERE item_name = 'Lamination';

DELETE FROM public.inventory
WHERE item_name = 'Enveloppes C5';

INSERT INTO public.inventory (
  item_name,
  current_quantity,
  unit,
  alert_threshold,
  usage_per_sheet,
  supplier_url
) VALUES
  (
    'Vinyle adhésif imprimable A4',
    200,
    'feuilles',
    40,
    1,
    NULL
  ),
  (
    'Film lamination à froid A4',
    200,
    'feuilles',
    40,
    1,
    NULL
  ),
  (
    'Encres Canon G650 (GI-41 / GI-46)',
    6,
    'bouteilles',
    2,
    0,
    NULL
  ),
  (
    'Film transfert (rouleau 30 cm)',
    3000,
    'cm',
    600,
    30,
    NULL
  ),
  (
    'Lame AutoBlade Cameo 4',
    2,
    'unités',
    1,
    0,
    NULL
  ),
  (
    'Tapis découpe Silhouette 12″',
    1,
    'unités',
    1,
    0,
    NULL
  ),
  (
    'Carte de pose (carton 250–300 g)',
    180,
    'unités',
    45,
    1,
    NULL
  ),
  (
    'Puce NFC NTAG213 (tuto)',
    150,
    'unités',
    40,
    1,
    NULL
  ),
  (
    'Carte merci + QR avis',
    120,
    'unités',
    30,
    1,
    NULL
  ),
  (
    'Lingette nettoyante',
    200,
    'unités',
    50,
    1,
    NULL
  ),
  (
    'Enveloppe DL 220×110',
    250,
    'unités',
    60,
    1,
    NULL
  ),
  (
    'Sticker « ouvre-moi » (Ø 40 mm)',
    500,
    'unités',
    80,
    1,
    NULL
  ),
  (
    'Étiquette d''expédition',
    300,
    'unités',
    75,
    1,
    NULL
  )
ON CONFLICT (item_name) DO UPDATE SET
  unit = EXCLUDED.unit,
  alert_threshold = EXCLUDED.alert_threshold,
  usage_per_sheet = EXCLUDED.usage_per_sheet;

COMMENT ON TABLE public.inventory IS
  'Stock DripMyCard : décompte auto à la génération de lot (feuilles A4 + kit par commande).';
