ALTER TABLE public.email_send_state
  ADD COLUMN IF NOT EXISTS last_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_run_processed integer,
  ADD COLUMN IF NOT EXISTS last_run_status text;