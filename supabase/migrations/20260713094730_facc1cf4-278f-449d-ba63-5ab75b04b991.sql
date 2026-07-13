
-- PR 3: share-link hardening (hash-at-rest, expiry, revoke).
-- Keep raw share_token column for the transition; a follow-up will drop it
-- once admin UI stops relying on it.

ALTER TABLE public.style_boards
  ADD COLUMN IF NOT EXISTS share_token_hash text,
  ADD COLUMN IF NOT EXISTS share_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS share_token_revoked_at timestamptz;

-- Backfill: hash existing raw tokens, default 90-day expiry.
UPDATE public.style_boards
SET
  share_token_hash = encode(digest(share_token, 'sha256'), 'hex'),
  share_token_expires_at = COALESCE(share_token_expires_at, now() + interval '90 days')
WHERE share_token IS NOT NULL
  AND share_token_hash IS NULL;

-- Unique index on hash (partial: only where present) for lookup path.
CREATE UNIQUE INDEX IF NOT EXISTS style_boards_share_token_hash_idx
  ON public.style_boards (share_token_hash)
  WHERE share_token_hash IS NOT NULL;
