
-- Drop if re-running
DROP VIEW IF EXISTS public.llm_reextract_candidates_canonical CASCADE;
DROP VIEW IF EXISTS public.scraped_product_images_canonical CASCADE;
DROP VIEW IF EXISTS public.scraped_products_canonical CASCADE;

-- 1. Canonical scraped_products: one row per URL, best record wins.
CREATE VIEW public.scraped_products_canonical AS
WITH ranked AS (
  SELECT
    sp.*,
    ROW_NUMBER() OVER (
      PARTITION BY sp.url
      ORDER BY
        COALESCE(sp.parse_confidence, 0) DESC,
        (sp.product_title_normalized IS NOT NULL AND length(sp.product_title_normalized) > 0)::int DESC,
        (sp.hero_image_url IS NOT NULL)::int DESC,
        (sp.stocked_quantity IS NOT NULL)::int DESC,
        (sp.dimensions IS NOT NULL)::int DESC,
        sp.scraped_at DESC,
        sp.id DESC
    ) AS rn
  FROM public.scraped_products sp
  WHERE sp.phase = 'phase3a_markdown'
)
SELECT * FROM ranked WHERE rn = 1;

-- 2. Canonical images: only those belonging to a canonical winner row.
CREATE VIEW public.scraped_product_images_canonical AS
SELECT spi.*
FROM public.scraped_product_images spi
JOIN public.scraped_products_canonical c
  ON c.id = spi.scraped_product_id;

-- 3. Canonical re-extract candidates: dedupe by URL, keep most recent,
--    and only include URLs whose canonical winner still needs re-extraction.
CREATE VIEW public.llm_reextract_candidates_canonical AS
WITH ranked AS (
  SELECT
    lrc.*,
    ROW_NUMBER() OVER (PARTITION BY lrc.url ORDER BY lrc.created_at DESC, lrc.id DESC) AS rn
  FROM public.llm_reextract_candidates lrc
)
SELECT r.*
FROM ranked r
JOIN public.scraped_products_canonical c ON c.url = r.url
WHERE r.rn = 1
  AND c.needs_llm_reextract = true;

-- Lock down: views inherit table RLS, but be explicit about grants.
REVOKE ALL ON public.scraped_products_canonical FROM PUBLIC, anon;
REVOKE ALL ON public.scraped_product_images_canonical FROM PUBLIC, anon;
REVOKE ALL ON public.llm_reextract_candidates_canonical FROM PUBLIC, anon;
GRANT SELECT ON public.scraped_products_canonical TO authenticated;
GRANT SELECT ON public.scraped_product_images_canonical TO authenticated;
GRANT SELECT ON public.llm_reextract_candidates_canonical TO authenticated;
