ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS taxonomy_review jsonb;

COMMENT ON COLUMN public.inventory_items.taxonomy_review IS
'{ confidence: high|med|low, source: squarespace|squarespace-export|squarespace+title|liveCat+title|title|export-disagreement|none|human, reviewed: boolean, needs_owner: boolean, reviewed_by?: uuid, reviewed_at?: timestamptz }';