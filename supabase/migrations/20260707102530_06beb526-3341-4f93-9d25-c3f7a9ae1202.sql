
-- 1) Fix outcome stamp trigger so admin edits actually record the editor.
--    auth.uid() is populated when RLS-authenticated writes happen; fall back
--    to whatever the caller passed (server-side updates via admin client).
CREATE OR REPLACE FUNCTION public.inquiries_stamp_outcome()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF (TG_OP = 'UPDATE') AND (
    NEW.status IS DISTINCT FROM OLD.status
    OR NEW.quote_value IS DISTINCT FROM OLD.quote_value
    OR NEW.outcome_notes IS DISTINCT FROM OLD.outcome_notes
  ) THEN
    NEW.outcome_updated_at := now();
    NEW.outcome_updated_by := COALESCE(auth.uid(), NEW.outcome_updated_by);
  END IF;
  RETURN NEW;
END;
$function$;

-- 2) Soft-delete column on inquiries. NULL = live row.
ALTER TABLE public.inquiries
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS inquiries_deleted_at_idx
  ON public.inquiries (deleted_at)
  WHERE deleted_at IS NULL;
