REVOKE SELECT (hidden_note) ON public.inventory_items FROM anon;
DROP POLICY IF EXISTS "Anyone can submit a studio brief" ON public.studio_briefs;