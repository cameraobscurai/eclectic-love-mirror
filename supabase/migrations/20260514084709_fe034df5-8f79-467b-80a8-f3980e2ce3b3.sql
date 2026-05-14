-- Tableware piece-variant cleanup: remove cross-piece images from each variant.
-- Pattern: each silverware piece row carried the entire family's gallery
-- (set photo + every other piece). Keep set photo + the variant's own piece.
-- 50 rows updated, 171 cross-piece images removed.

UPDATE inventory_items SET images=ARRAY['https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/inventory/inventory/TABLEWEAR/ALTA Set.png','https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/inventory/inventory/TABLEWEAR/ALTA Butter Knife.png'], updated_at=now() WHERE rms_id='2690';
UPDATE inventory_items SET images=ARRAY['https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/inventory/inventory/TABLEWEAR/ALTA Set.png','https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/inventory/inventory/TABLEWEAR/ALTA Dinner Fork.png'], updated_at=now() WHERE rms_id='2687';
UPDATE inventory_items SET images=ARRAY['https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/inventory/inventory/TABLEWEAR/ALTA Set.png','https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/inventory/inventory/TABLEWEAR/ALTA Dinner Knife.png'], updated_at=now() WHERE rms_id='2686';
-- (full plan inlined below)
