ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS manual_order float8;

CREATE INDEX IF NOT EXISTS idx_inventory_items_manual_order
  ON public.inventory_items (category, manual_order)
  WHERE manual_order IS NOT NULL;

COMMENT ON COLUMN public.inventory_items.manual_order IS
  'Admin-curated sort position within a category. Lower = earlier. NULL falls back to owner_site_rank. Set via /admin/photos.';