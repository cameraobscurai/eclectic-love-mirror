
CREATE TABLE IF NOT EXISTS public.scraped_product_llm_repairs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id uuid,
  source_url text NOT NULL,
  category_slug text,
  product_slug text,
  product_title_original text,
  product_title_normalized text,
  description text,
  dimensions text,
  stocked_quantity text,
  image_urls text[] DEFAULT '{}'::text[],
  primary_image_url text,
  inferred_filenames text[] DEFAULT '{}'::text[],
  alt_texts text[] DEFAULT '{}'::text[],
  confidence numeric,
  repaired_fields text[] DEFAULT '{}'::text[],
  still_missing_fields text[] DEFAULT '{}'::text[],
  repair_notes text,
  raw_response jsonb,
  model text,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scraped_product_llm_repairs_url_idx
  ON public.scraped_product_llm_repairs(source_url);
CREATE INDEX IF NOT EXISTS scraped_product_llm_repairs_run_idx
  ON public.scraped_product_llm_repairs(run_id);

ALTER TABLE public.scraped_product_llm_repairs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage scraped_product_llm_repairs" ON public.scraped_product_llm_repairs;
CREATE POLICY "Admins manage scraped_product_llm_repairs"
  ON public.scraped_product_llm_repairs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE VIEW public.scraped_product_llm_repairs_latest AS
WITH ranked AS (
  SELECT r.*, ROW_NUMBER() OVER (
    PARTITION BY source_url
    ORDER BY (status='success') DESC, created_at DESC, id DESC
  ) AS rn
  FROM public.scraped_product_llm_repairs r
)
SELECT * FROM ranked WHERE rn = 1;
ALTER VIEW public.scraped_product_llm_repairs_latest SET (security_invoker = true);

DROP VIEW IF EXISTS public.scraped_products_final_canonical CASCADE;

CREATE VIEW public.scraped_products_final_canonical AS
SELECT
  c.id,
  c.url,
  c.category_slug,
  c.slug AS product_slug,

  COALESCE(NULLIF(c.product_title_original, ''),  r.product_title_original)   AS product_title_original,
  COALESCE(NULLIF(c.product_title_normalized, ''), r.product_title_normalized) AS product_title_normalized,

  COALESCE(NULLIF(c.description, ''),       r.description)       AS description,
  COALESCE(NULLIF(c.dimensions, ''),        r.dimensions)        AS dimensions,
  COALESCE(NULLIF(c.stocked_quantity, ''),  r.stocked_quantity)  AS stocked_quantity,

  c.is_custom_order_co,
  c.material_notes, c.color_notes, c.size_notes, c.generic_notes,
  c.add_to_cart_present, c.quantity_selector_present, c.variant_selector_present,
  c.previous_product_url, c.next_product_url, c.related_product_urls, c.breadcrumb,

  COALESCE(c.hero_image_url, r.primary_image_url) AS hero_image_url,

  (r.id IS NOT NULL AND r.status = 'success') AS repaired_by_llm,
  CASE WHEN r.id IS NOT NULL AND r.status = 'success'
       THEN 'markdown_plus_llm_repair' ELSE 'markdown' END AS extraction_method,

  GREATEST(COALESCE(c.parse_confidence, 0), COALESCE(r.confidence, 0)) AS final_confidence,
  c.parse_confidence AS markdown_confidence,
  r.confidence       AS repair_confidence,
  c.missing_fields   AS markdown_missing_fields,
  r.still_missing_fields,
  r.repaired_fields,

  c.needs_llm_reextract,
  c.scraped_at,
  c.run_id
FROM public.scraped_products_canonical c
LEFT JOIN public.scraped_product_llm_repairs_latest r
  ON r.source_url = c.url AND r.status = 'success';

ALTER VIEW public.scraped_products_final_canonical SET (security_invoker = true);

DROP VIEW IF EXISTS public.scraped_product_images_final_canonical CASCADE;

CREATE VIEW public.scraped_product_images_final_canonical AS
SELECT
  spi.id,
  spi.scraped_product_id,
  c.url AS source_page_url,
  spi.image_url,
  spi.alt_text,
  spi.position,
  spi.is_hero,
  spi.inferred_filename,
  'markdown'::text AS image_source
FROM public.scraped_product_images_canonical spi
JOIN public.scraped_products_canonical c ON c.id = spi.scraped_product_id

UNION ALL

SELECT
  gen_random_uuid() AS id,
  c.id AS scraped_product_id,
  c.url AS source_page_url,
  img.image_url,
  NULLIF(alts.alt, '') AS alt_text,
  (img.ord - 1)::int AS position,
  (img.ord = 1) AS is_hero,
  NULLIF(fns.fn, '') AS inferred_filename,
  'llm_repair'::text AS image_source
FROM public.scraped_products_canonical c
JOIN public.scraped_product_llm_repairs_latest r
  ON r.source_url = c.url AND r.status = 'success'
LEFT JOIN LATERAL unnest(r.image_urls)         WITH ORDINALITY AS img(image_url, ord) ON TRUE
LEFT JOIN LATERAL unnest(r.alt_texts)          WITH ORDINALITY AS alts(alt, ord)      ON alts.ord = img.ord
LEFT JOIN LATERAL unnest(r.inferred_filenames) WITH ORDINALITY AS fns(fn, ord)        ON fns.ord = img.ord
WHERE NOT EXISTS (
  SELECT 1 FROM public.scraped_product_images_canonical spi2
  WHERE spi2.scraped_product_id = c.id
)
AND img.image_url IS NOT NULL;

ALTER VIEW public.scraped_product_images_final_canonical SET (security_invoker = true);

REVOKE ALL ON public.scraped_product_llm_repairs FROM PUBLIC, anon;
REVOKE ALL ON public.scraped_product_llm_repairs_latest FROM PUBLIC, anon;
REVOKE ALL ON public.scraped_products_final_canonical FROM PUBLIC, anon;
REVOKE ALL ON public.scraped_product_images_final_canonical FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scraped_product_llm_repairs TO authenticated;
GRANT SELECT ON public.scraped_product_llm_repairs_latest TO authenticated;
GRANT SELECT ON public.scraped_products_final_canonical TO authenticated;
GRANT SELECT ON public.scraped_product_images_final_canonical TO authenticated;
