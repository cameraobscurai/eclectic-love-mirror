
CREATE TABLE public.studio_renders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rms_id text,
  product_title text,
  preset text NOT NULL,
  model text NOT NULL,
  prompt text NOT NULL,
  storage_path text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX studio_renders_rms_idx ON public.studio_renders(rms_id);
CREATE INDEX studio_renders_created_idx ON public.studio_renders(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_renders TO authenticated;
GRANT ALL ON public.studio_renders TO service_role;

ALTER TABLE public.studio_renders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read renders"
  ON public.studio_renders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins write renders"
  ON public.studio_renders FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update renders"
  ON public.studio_renders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete renders"
  ON public.studio_renders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Storage policies for the private studio-renders bucket
CREATE POLICY "admins read studio-renders"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'studio-renders' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins write studio-renders"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'studio-renders' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update studio-renders"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'studio-renders' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'studio-renders' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete studio-renders"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'studio-renders' AND public.has_role(auth.uid(), 'admin'));
