-- Lock down SECURITY DEFINER functions from anon/authenticated exposure.
-- These are internal (cron, trigger, or invoked via server-side RPC through service_role).
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.inventory_items_audit() FROM PUBLIC, anon, authenticated;
-- reorder_inventory_items is called by admin server functions via service_role; keep authenticated off (function still self-checks admin).
REVOKE EXECUTE ON FUNCTION public.reorder_inventory_items(jsonb) FROM PUBLIC, anon;

-- Restrict product-covers storage bucket reads to staff/admin only (was any authenticated).
DROP POLICY IF EXISTS "authenticated read product-covers" ON storage.objects;
CREATE POLICY "staff read product-covers"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'product-covers' AND public.is_staff_or_admin(auth.uid()));