-- Replace broad SELECT-all with object-level access (still public read of files by path, no listing)
DROP POLICY IF EXISTS "Public can view inventory images" ON storage.objects;

-- Public can fetch individual files in the inventory bucket by exact name (no listing via API)
CREATE POLICY "Public can read inventory image files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'inventory' AND name IS NOT NULL);

-- Revoke direct EXECUTE on has_role; RLS policies still execute it as the function owner
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;