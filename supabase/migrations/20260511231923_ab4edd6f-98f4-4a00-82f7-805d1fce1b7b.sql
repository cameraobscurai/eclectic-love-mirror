
-- Add structured selection + snapshot + project metadata to inquiries.
ALTER TABLE public.inquiries
  ADD COLUMN IF NOT EXISTS item_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS item_snapshots jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.inquiries.item_id IS 'LEGACY — first item only. Prefer item_ids for full ordered selection.';
COMMENT ON COLUMN public.inquiries.item_ids IS 'Full ordered list of inventory_items.id values selected by the customer.';
COMMENT ON COLUMN public.inquiries.item_snapshots IS 'Frozen-at-submit snapshot of each selected piece: [{id,title,category,image_url}].';
COMMENT ON COLUMN public.inquiries.metadata IS 'Structured project metadata: {project_date, budget, scope}.';

-- Tighten the public-insert policy to bound payload size and validate new columns.
DROP POLICY IF EXISTS "Anyone can submit an inquiry" ON public.inquiries;
CREATE POLICY "Anyone can submit an inquiry"
  ON public.inquiries
  FOR INSERT
  TO public
  WITH CHECK (
    length(name) BETWEEN 1 AND 200
    AND length(email) BETWEEN 3 AND 320
    AND length(message) BETWEEN 1 AND 5000
    AND cardinality(item_ids) <= 50
    AND octet_length(item_snapshots::text) < 16000
    AND octet_length(metadata::text) < 4000
  );
