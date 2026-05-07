
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS color_hex text,
  ADD COLUMN IF NOT EXISTS color_hex_secondary text,
  ADD COLUMN IF NOT EXISTS color_lightness numeric,
  ADD COLUMN IF NOT EXISTS color_hue numeric,
  ADD COLUMN IF NOT EXISTS color_chroma numeric,
  ADD COLUMN IF NOT EXISTS color_family text,
  ADD COLUMN IF NOT EXISTS color_temperature text,
  ADD COLUMN IF NOT EXISTS color_confidence numeric,
  ADD COLUMN IF NOT EXISTS color_source text,
  ADD COLUMN IF NOT EXISTS color_tagged_at timestamptz,
  ADD COLUMN IF NOT EXISTS color_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS color_notes text,
  ADD COLUMN IF NOT EXISTS color_needs_review boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_inventory_items_color_tagged_at
  ON public.inventory_items (color_tagged_at);
CREATE INDEX IF NOT EXISTS idx_inventory_items_color_family
  ON public.inventory_items (color_family);

CREATE OR REPLACE FUNCTION public.inventory_items_clear_color_tag_on_image_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.color_locked IS TRUE THEN
    RETURN NEW;
  END IF;
  IF (TG_OP = 'UPDATE') AND (NEW.images IS DISTINCT FROM OLD.images) THEN
    NEW.color_tagged_at := NULL;
    NEW.color_needs_review := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_items_clear_color_tag_on_image_change
  ON public.inventory_items;
CREATE TRIGGER trg_inventory_items_clear_color_tag_on_image_change
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.inventory_items_clear_color_tag_on_image_change();
