
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'owner-uploads',
  'owner-uploads',
  true,
  52428800, -- 50 MB per file
  ARRAY['image/jpeg','image/png','image/webp','image/avif','image/heic','image/heif','image/tiff']
)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "owner-uploads public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'owner-uploads');

-- Admin write/update/delete
CREATE POLICY "owner-uploads admin insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'owner-uploads' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "owner-uploads admin update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'owner-uploads' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "owner-uploads admin delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'owner-uploads' AND public.has_role(auth.uid(), 'admin'));
