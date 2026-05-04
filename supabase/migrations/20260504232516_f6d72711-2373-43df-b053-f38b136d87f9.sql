ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS rms_id text,
  ADD COLUMN IF NOT EXISTS quantity integer,
  ADD COLUMN IF NOT EXISTS quantity_label text,
  ADD COLUMN IF NOT EXISTS dimensions_raw text;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_items_rms_id_key
  ON public.inventory_items (rms_id) WHERE rms_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS inventory_items_category_idx
  ON public.inventory_items (category);

CREATE INDEX IF NOT EXISTS inventory_items_status_idx
  ON public.inventory_items (status);