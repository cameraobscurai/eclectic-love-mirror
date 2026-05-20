-- Photo archive bucket: write-once mirror of owner originals.
-- Private (no public read). Service role writes during backfill + upload hook.
-- Admins can read in admin tools if needed.
INSERT INTO storage.buckets (id, name, public)
VALUES ('inventory-photo-archive', 'inventory-photo-archive', false)
ON CONFLICT (id) DO NOTHING;

-- Admins can read archive files (for any future restore UI).
CREATE POLICY "Admins read photo archive"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'inventory-photo-archive'
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- No INSERT/UPDATE/DELETE policies for authenticated users.
-- Only the service role (used by backfill script + server upload hook)
-- can write. App code never deletes archived files.
