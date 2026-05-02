-- Raw evidence table: one row per URL scraped, with the markdown.
CREATE TABLE IF NOT EXISTS public.scraped_product_pages_markdown (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.scrape_runs(id) ON DELETE CASCADE,
  url text NOT NULL,
  category_slug text,
  product_slug text,
  http_status integer,
  markdown text,
  metadata jsonb,
  links text[],
  credits_used integer,
  scraped_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, url)
);

CREATE INDEX IF NOT EXISTS idx_spm_run ON public.scraped_product_pages_markdown(run_id);
CREATE INDEX IF NOT EXISTS idx_spm_url ON public.scraped_product_pages_markdown(url);

ALTER TABLE public.scraped_product_pages_markdown ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage scraped_product_pages_markdown"
ON public.scraped_product_pages_markdown
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add parser quality fields to scraped_products (already has phase, missing_fields, warnings, parse_errors)
ALTER TABLE public.scraped_products
  ADD COLUMN IF NOT EXISTS parse_confidence numeric,
  ADD COLUMN IF NOT EXISTS ambiguity_flags text[],
  ADD COLUMN IF NOT EXISTS needs_llm_reextract boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reextract_reason text;

CREATE INDEX IF NOT EXISTS idx_sp_needs_reextract
  ON public.scraped_products(needs_llm_reextract)
  WHERE needs_llm_reextract = true;

-- Queue of pages flagged for paid LLM re-extraction.
CREATE TABLE IF NOT EXISTS public.llm_reextract_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.scrape_runs(id) ON DELETE CASCADE,
  url text NOT NULL UNIQUE,
  category_slug text,
  product_slug text,
  reason text NOT NULL,
  missing_fields text[],
  ambiguity_flags text[],
  parse_confidence numeric,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | reextracted | rejected
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid
);

CREATE INDEX IF NOT EXISTS idx_lrc_status ON public.llm_reextract_candidates(status);

ALTER TABLE public.llm_reextract_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage llm_reextract_candidates"
ON public.llm_reextract_candidates
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));