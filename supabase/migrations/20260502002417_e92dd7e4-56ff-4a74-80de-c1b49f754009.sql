-- Extend scraped_products with all Phase 3A fields
ALTER TABLE public.scraped_products
  ADD COLUMN IF NOT EXISTS phase text,
  ADD COLUMN IF NOT EXISTS product_title_original text,
  ADD COLUMN IF NOT EXISTS product_title_normalized text,
  ADD COLUMN IF NOT EXISTS is_custom_order_co boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS inferred_category_label text,
  ADD COLUMN IF NOT EXISTS dimensions text,
  ADD COLUMN IF NOT EXISTS stocked_quantity text,
  ADD COLUMN IF NOT EXISTS material_notes text,
  ADD COLUMN IF NOT EXISTS color_notes text,
  ADD COLUMN IF NOT EXISTS size_notes text,
  ADD COLUMN IF NOT EXISTS generic_notes text,
  ADD COLUMN IF NOT EXISTS add_to_cart_present boolean,
  ADD COLUMN IF NOT EXISTS quantity_selector_present boolean,
  ADD COLUMN IF NOT EXISTS variant_selector_present boolean,
  ADD COLUMN IF NOT EXISTS previous_product_url text,
  ADD COLUMN IF NOT EXISTS next_product_url text,
  ADD COLUMN IF NOT EXISTS related_product_urls text[],
  ADD COLUMN IF NOT EXISTS extraction_confidence numeric,
  ADD COLUMN IF NOT EXISTS missing_fields text[],
  ADD COLUMN IF NOT EXISTS warnings text[],
  ADD COLUMN IF NOT EXISTS parse_errors text[];

CREATE INDEX IF NOT EXISTS idx_scraped_products_phase ON public.scraped_products(phase);

-- Extend scraped_product_images
ALTER TABLE public.scraped_product_images
  ADD COLUMN IF NOT EXISTS inferred_filename text,
  ADD COLUMN IF NOT EXISTS visible_filename text,
  ADD COLUMN IF NOT EXISTS source_page_url text;

-- New: scraped_product_variants
CREATE TABLE IF NOT EXISTS public.scraped_product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scraped_product_id uuid NOT NULL REFERENCES public.scraped_products(id) ON DELETE CASCADE,
  kind text NOT NULL, -- 'variant' | 'size' | 'color' | other
  label text,
  value text,
  position integer NOT NULL DEFAULT 0,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scraped_product_variants_product
  ON public.scraped_product_variants(scraped_product_id);

ALTER TABLE public.scraped_product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage scraped_product_variants"
ON public.scraped_product_variants
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- New: scrape_errors
CREATE TABLE IF NOT EXISTS public.scrape_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.scrape_runs(id) ON DELETE CASCADE,
  url text NOT NULL,
  phase text NOT NULL,
  error_type text NOT NULL,
  error_message text,
  http_status integer,
  attempt integer NOT NULL DEFAULT 1,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scrape_errors_run ON public.scrape_errors(run_id);
CREATE INDEX IF NOT EXISTS idx_scrape_errors_url ON public.scrape_errors(url);

ALTER TABLE public.scrape_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage scrape_errors"
ON public.scrape_errors
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));