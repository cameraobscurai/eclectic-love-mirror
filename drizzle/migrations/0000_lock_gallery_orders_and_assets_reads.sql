DROP POLICY IF EXISTS "gallery_orders public read" ON public.gallery_orders;
CREATE POLICY "gallery_orders admin read" ON public.gallery_orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Public read assets bucket" ON storage.objects;
DROP POLICY IF EXISTS "temp_anon_read_the_edit" ON storage.objects;