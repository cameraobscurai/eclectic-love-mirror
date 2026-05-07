
-- Create the canonical "collection" storage bucket: public read, admin write.
INSERT INTO storage.buckets (id, name, public)
VALUES ('collection', 'collection', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Collection images are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'collection');

-- Admin write access (insert / update / delete)
CREATE POLICY "Admins can upload collection images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'collection' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update collection images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'collection' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'collection' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete collection images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'collection' AND public.has_role(auth.uid(), 'admin'));
