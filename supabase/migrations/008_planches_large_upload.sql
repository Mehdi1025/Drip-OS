-- Limite bucket planches : 5 Go par PDF (ajustable dans Storage si besoin).
UPDATE storage.buckets
SET file_size_limit = 5368709120
WHERE id = 'planches';
