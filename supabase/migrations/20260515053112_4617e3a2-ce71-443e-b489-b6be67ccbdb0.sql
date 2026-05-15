
ALTER TABLE public.style_boards
  ADD COLUMN IF NOT EXISTS share_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS pin_notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS client_view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz;

CREATE INDEX IF NOT EXISTS style_boards_share_token_idx ON public.style_boards (share_token) WHERE share_token IS NOT NULL;

DROP POLICY IF EXISTS "Public can view sent style boards via share token" ON public.style_boards;
CREATE POLICY "Public can view sent style boards via share token"
  ON public.style_boards
  FOR SELECT
  TO anon, authenticated
  USING (share_token IS NOT NULL AND status = 'sent');
