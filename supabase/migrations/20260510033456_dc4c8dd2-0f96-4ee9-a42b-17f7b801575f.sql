-- Phase 3: inquiry outcome loop. Adds the columns needed to close the
-- feedback loop between an inquiry being submitted and the real-world
-- booking outcome. Status defaults to 'new'; admins update from the
-- dashboard. This is what lets us answer "did this site make money?"
-- per channel and per item later on.

CREATE TYPE public.inquiry_status AS ENUM (
  'new',
  'quoted',
  'booked',
  'lost',
  'ghosted'
);

ALTER TABLE public.inquiries
  ADD COLUMN status public.inquiry_status NOT NULL DEFAULT 'new',
  ADD COLUMN quote_value numeric(12, 2),
  ADD COLUMN outcome_notes text,
  ADD COLUMN outcome_updated_at timestamptz,
  ADD COLUMN outcome_updated_by uuid;

-- Backfill existing rows: anything previously marked handled becomes 'quoted'
-- as a sensible default. Admins can refine later.
UPDATE public.inquiries SET status = 'quoted' WHERE handled = true;

CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.inquiries (status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON public.inquiries (created_at DESC);

-- Trigger: stamp outcome_updated_at + outcome_updated_by whenever any
-- outcome field changes (status / quote_value / outcome_notes).
CREATE OR REPLACE FUNCTION public.inquiries_stamp_outcome()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE') AND (
    NEW.status IS DISTINCT FROM OLD.status
    OR NEW.quote_value IS DISTINCT FROM OLD.quote_value
    OR NEW.outcome_notes IS DISTINCT FROM OLD.outcome_notes
  ) THEN
    NEW.outcome_updated_at := now();
    NEW.outcome_updated_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inquiries_stamp_outcome ON public.inquiries;
CREATE TRIGGER trg_inquiries_stamp_outcome
  BEFORE UPDATE ON public.inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.inquiries_stamp_outcome();

-- RLS: admins only can update inquiries (read policy already exists).
DROP POLICY IF EXISTS "Admins can update inquiries" ON public.inquiries;
CREATE POLICY "Admins can update inquiries"
  ON public.inquiries
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
