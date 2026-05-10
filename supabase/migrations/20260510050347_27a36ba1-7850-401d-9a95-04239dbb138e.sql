ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS card_background_url text;

COMMENT ON COLUMN public.inventory_items.card_background_url IS
  'Optional editorial backdrop photograph rendered full-bleed behind the product cutout on the Collection wall tile. NOT part of the gallery (images[]) — never shows in QuickView thumbnails. Owner uploads via admin tool; URL points at the inventory bucket.';

-- Sylvanus: move the photo we previously tagged role:backdrop out of images[]
-- and into the new dedicated slot, so the gallery stays a clean cutout-only list.
UPDATE public.inventory_items
SET
  card_background_url = 'https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/inventory/inventory/seating/sylvanus-green-ash-sofa/extra-01.jpeg',
  images = ARRAY(
    SELECT u FROM unnest(images) AS u
    WHERE u <> 'https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/inventory/inventory/seating/sylvanus-green-ash-sofa/extra-01.jpeg'
  ),
  images_meta = '{}'::jsonb
WHERE rms_id = '2619';