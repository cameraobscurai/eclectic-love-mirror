ALTER TABLE public.style_boards
  ADD COLUMN IF NOT EXISTS production_notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS section_word text;