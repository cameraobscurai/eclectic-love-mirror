-- Make image-galleries bucket publicly readable for marketing imagery on the
-- public homepage and Gallery page. Mirrors the inventory bucket pattern:
--   * bucket.public = true so getPublicUrl() returns a usable URL
--   * object-level SELECT policy allows fetching by exact path (no listing)
--   * writes remain admin-only (existing admin write policies on storage.objects continue to apply)

UPDATE storage.buckets
SET public = true
WHERE id = 'image-galleries';

DROP POLICY IF EXISTS "Public can read image-galleries files" ON storage.objects;

CREATE POLICY "Public can read image-galleries files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'image-galleries' AND name IS NOT NULL);
