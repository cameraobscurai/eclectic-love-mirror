CREATE POLICY "admins manage product-covers"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'product-covers' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'product-covers' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "authenticated read product-covers"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'product-covers');