-- Explicit INSERT policy: only service_role may write audit rows.
-- All current writes go through supabaseAdmin (service_role) which bypasses
-- RLS, so this is forward-safety, not a behavior change.
CREATE POLICY "Only service role can insert audit"
  ON public.admin_audit_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);