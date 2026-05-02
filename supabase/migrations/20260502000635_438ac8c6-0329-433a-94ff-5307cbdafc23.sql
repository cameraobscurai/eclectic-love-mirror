-- Drop the early generic staging tables (wrong shape, no production data)
DROP TABLE IF EXISTS public.scraped_pages CASCADE;
DROP TABLE IF EXISTS public.scrape_jobs CASCADE;

-- Enums
CREATE TYPE public.scrape_phase AS ENUM ('map', 'category_scrape', 'product_scrape', 'reconcile');
CREATE TYPE public.scrape_run_status AS ENUM ('pending', 'running', 'succeeded', 'failed', 'cancelled');
CREATE TYPE public.scraped_url_kind AS ENUM ('unclassified', 'category_index', 'product_detail', 'nav_page', 'noise');
CREATE TYPE public.match_decision AS ENUM ('pending', 'approved', 'rejected', 'needs_review');

-- scrape_runs: one row per phase invocation
CREATE TABLE public.scrape_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase public.scrape_phase NOT NULL,
  status public.scrape_run_status NOT NULL DEFAULT 'pending',
  source_url text,
  firecrawl_job_id text,
  items_total integer,
  items_completed integer NOT NULL DEFAULT 0,
  credits_estimated integer,
  credits_used integer,
  error_message text,
  notes text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_scrape_runs_phase_status ON public.scrape_runs(phase, status);

-- scraped_urls: Phase 1 map output
CREATE TABLE public.scraped_urls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.scrape_runs(id) ON DELETE CASCADE,
  url text NOT NULL,
  path text NOT NULL,
  kind public.scraped_url_kind NOT NULL DEFAULT 'unclassified',
  classification_reason text,
  depth integer,
  discovered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(run_id, url)
);
CREATE INDEX idx_scraped_urls_run_kind ON public.scraped_urls(run_id, kind);

-- scraped_categories: Phase 3a output (taxonomy)
CREATE TABLE public.scraped_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.scrape_runs(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  url text NOT NULL,
  parent_slug text,
  display_order integer,
  product_count integer,
  raw jsonb,
  scraped_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(run_id, slug)
);
CREATE INDEX idx_scraped_categories_parent ON public.scraped_categories(run_id, parent_slug);

-- scraped_products: Phase 3b output
CREATE TABLE public.scraped_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.scrape_runs(id) ON DELETE CASCADE,
  url text NOT NULL,
  slug text NOT NULL,
  title text NOT NULL,
  category_slug text,
  subcategory_slug text,
  breadcrumb text[],
  description text,
  hero_image_url text,
  raw jsonb,
  scraped_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(run_id, url)
);
CREATE INDEX idx_scraped_products_run_category ON public.scraped_products(run_id, category_slug);
CREATE INDEX idx_scraped_products_slug ON public.scraped_products(slug);

-- scraped_product_images: every image URL per scraped product
CREATE TABLE public.scraped_product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scraped_product_id uuid NOT NULL REFERENCES public.scraped_products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  alt_text text,
  position integer NOT NULL DEFAULT 0,
  width integer,
  height integer,
  is_hero boolean NOT NULL DEFAULT false
);
CREATE INDEX idx_scraped_product_images_product ON public.scraped_product_images(scraped_product_id);

-- reconciliation_matches: Phase 4 output. The bridge between scraped truth + xlsx export + local images.
CREATE TABLE public.reconciliation_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scraped_product_id uuid REFERENCES public.scraped_products(id) ON DELETE SET NULL,
  xlsx_current_rms_id text,
  xlsx_name text,
  xlsx_product_group text,
  local_image_path text,
  confidence numeric(4,3),
  match_reasons jsonb NOT NULL DEFAULT '{}'::jsonb,
  conflicts jsonb NOT NULL DEFAULT '[]'::jsonb,
  decision public.match_decision NOT NULL DEFAULT 'pending',
  decided_by uuid,
  decided_at timestamptz,
  applied_inventory_item_id uuid,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_reconciliation_matches_decision ON public.reconciliation_matches(decision);
CREATE INDEX idx_reconciliation_matches_rms ON public.reconciliation_matches(xlsx_current_rms_id);
CREATE INDEX idx_reconciliation_matches_scraped ON public.reconciliation_matches(scraped_product_id);

-- updated_at triggers
CREATE TRIGGER trg_scrape_runs_updated_at
  BEFORE UPDATE ON public.scrape_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_reconciliation_matches_updated_at
  BEFORE UPDATE ON public.reconciliation_matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: admin-only on all staging tables
ALTER TABLE public.scrape_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraped_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraped_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraped_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraped_product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_matches ENABLE ROW LEVEL SECURITY;

-- Admin-only policies (one per table, ALL operations)
CREATE POLICY "Admins manage scrape_runs" ON public.scrape_runs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage scraped_urls" ON public.scraped_urls
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage scraped_categories" ON public.scraped_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage scraped_products" ON public.scraped_products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage scraped_product_images" ON public.scraped_product_images
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage reconciliation_matches" ON public.reconciliation_matches
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));