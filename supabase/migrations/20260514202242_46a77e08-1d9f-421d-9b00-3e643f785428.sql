ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS images_archive jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.inventory_items.images_archive IS
  'Snapshots of prior images[] arrays before bulk replacement. Each entry: {archived_at, reason, images: text[]}.';