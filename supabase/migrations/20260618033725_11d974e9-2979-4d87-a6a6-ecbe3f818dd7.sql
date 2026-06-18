ALTER TABLE public.style_boards
  ADD COLUMN IF NOT EXISTS prepared_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS prepared_by_name text,
  ADD COLUMN IF NOT EXISTS project_title text;