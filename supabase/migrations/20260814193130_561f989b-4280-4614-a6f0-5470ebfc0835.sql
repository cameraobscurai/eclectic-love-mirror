CREATE TABLE public.variant_config_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  family_id uuid NOT NULL REFERENCES public.product_families(id) ON DELETE CASCADE,
  family_title text NOT NULL DEFAULT '',
  action text NOT NULL CHECK (action IN ('apply', 'clear', 'rollback')),
  -- State BEFORE the change. Restoring these fields is the rollback.
  prev_option_name text,
  prev_members jsonb NOT NULL DEFAULT '[]'::jsonb,
  rolled_back_at timestamp with time zone,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX variant_config_snapshots_batch_idx ON public.variant_config_snapshots (batch_id, created_at DESC);
CREATE INDEX variant_config_snapshots_recent_idx ON public.variant_config_snapshots (created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.variant_config_snapshots TO authenticated;
GRANT ALL ON public.variant_config_snapshots TO service_role;

ALTER TABLE public.variant_config_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read variant snapshots"
  ON public.variant_config_snapshots FOR SELECT TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can write variant snapshots"
  ON public.variant_config_snapshots FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can mark variant snapshots rolled back"
  ON public.variant_config_snapshots FOR UPDATE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));