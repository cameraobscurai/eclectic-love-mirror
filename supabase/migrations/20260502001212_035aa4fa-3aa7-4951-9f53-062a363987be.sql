ALTER TABLE public.scraped_urls
  ADD COLUMN IF NOT EXISTS path_depth integer,
  ADD COLUMN IF NOT EXISTS first_segment text,
  ADD COLUMN IF NOT EXISTS second_segment text,
  ADD COLUMN IF NOT EXISTS page_type text,
  ADD COLUMN IF NOT EXISTS category_slug_candidate text,
  ADD COLUMN IF NOT EXISTS product_slug_candidate text,
  ADD COLUMN IF NOT EXISTS is_category_index boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_product_detail_candidate boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_likely_legacy boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_subbrand boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS co_flag boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS canonical_category_candidate text,
  ADD COLUMN IF NOT EXISTS classification_confidence numeric(4,3);

CREATE INDEX IF NOT EXISTS idx_scraped_urls_page_type ON public.scraped_urls(page_type);
CREATE INDEX IF NOT EXISTS idx_scraped_urls_first_segment ON public.scraped_urls(first_segment);
CREATE INDEX IF NOT EXISTS idx_scraped_urls_category_candidate ON public.scraped_urls(category_slug_candidate);