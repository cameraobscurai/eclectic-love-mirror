-- Phase 2B reconciliation manifest tables
-- These are decision artifacts. No Firecrawl credits are spent to populate them.

CREATE TYPE public.phase3_classification AS ENUM (
  'scrape_phase3a_main_inventory',
  'hold_parallel_category_review',
  'hold_subbrand_review',
  'exclude_test',
  'exclude_vanity_or_marketing',
  'unknown_needs_review'
);

CREATE TABLE public.phase3_scrape_manifest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL UNIQUE,
  category_slug text,
  product_slug text,
  classification public.phase3_classification NOT NULL,
  classification_reason text NOT NULL,
  product_count_group integer,
  is_1_suffixed_category boolean NOT NULL DEFAULT false,
  has_base_category_pair boolean NOT NULL DEFAULT false,
  overlaps_with_base_category boolean NOT NULL DEFAULT false,
  is_ut_prefixed boolean NOT NULL DEFAULT false,
  is_custom_order_co boolean NOT NULL DEFAULT false,
  recommended_phase text NOT NULL,
  scrape_priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_phase3_manifest_classification ON public.phase3_scrape_manifest(classification);
CREATE INDEX idx_phase3_manifest_category ON public.phase3_scrape_manifest(category_slug);

ALTER TABLE public.phase3_scrape_manifest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage phase3_scrape_manifest"
ON public.phase3_scrape_manifest
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.phase3_category_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_slug text NOT NULL UNIQUE,
  product_count integer NOT NULL,
  classification public.phase3_classification NOT NULL,
  reason text NOT NULL,
  include_in_phase3a boolean NOT NULL,
  human_review_required boolean NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.phase3_category_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage phase3_category_summary"
ON public.phase3_category_summary
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));