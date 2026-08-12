CREATE TABLE public.deleted_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id uuid NOT NULL,
  rms_id text,
  title text,
  deleted_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_by uuid
);

CREATE INDEX deleted_items_rms_id_idx ON public.deleted_items (rms_id);

GRANT SELECT, INSERT, DELETE ON public.deleted_items TO authenticated;
GRANT ALL ON public.deleted_items TO service_role;

ALTER TABLE public.deleted_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view deletion records"
  ON public.deleted_items FOR SELECT TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can record deletions"
  ON public.deleted_items FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Admins can purge deletion records"
  ON public.deleted_items FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));