CREATE TABLE public.product_families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  lead_rms_id text,
  option_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.product_families TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_families TO authenticated;
GRANT ALL ON public.product_families TO service_role;

ALTER TABLE public.product_families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_families public read"
  ON public.product_families FOR SELECT
  USING (true);

CREATE POLICY "product_families admin write"
  ON public.product_families FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER product_families_updated_at
  BEFORE UPDATE ON public.product_families
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.inventory_items
  ADD COLUMN family_id uuid REFERENCES public.product_families(id) ON DELETE SET NULL,
  ADD COLUMN family_position integer,
  ADD COLUMN variant_label text,
  ADD COLUMN variant_cover_url text;

CREATE INDEX idx_inventory_items_family
  ON public.inventory_items (family_id, family_position);

-- Normalized URL comparison: strip query string so a cache-busting ?v= suffix
-- on either side never invalidates a legitimate pointer.
CREATE OR REPLACE FUNCTION public.normalize_image_url(_url text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT split_part(coalesce(_url, ''), '?', 1)
$$;

CREATE OR REPLACE FUNCTION public.inventory_items_validate_variant_cover()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.variant_cover_url IS NULL OR NEW.variant_cover_url = '' THEN
    NEW.variant_cover_url := NULL;
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM unnest(coalesce(NEW.images, ARRAY[]::text[])) AS img
    WHERE public.normalize_image_url(img) = public.normalize_image_url(NEW.variant_cover_url)
  ) THEN
    IF TG_OP = 'UPDATE'
       AND OLD.variant_cover_url IS NOT DISTINCT FROM NEW.variant_cover_url
       AND NEW.images IS DISTINCT FROM OLD.images THEN
      -- The photo was genuinely removed from this row: clear the pin, fall back to AUTO.
      NEW.variant_cover_url := NULL;
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'variant_cover_url must be one of this item''s own images';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inventory_items_validate_variant_cover
  BEFORE INSERT OR UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.inventory_items_validate_variant_cover();