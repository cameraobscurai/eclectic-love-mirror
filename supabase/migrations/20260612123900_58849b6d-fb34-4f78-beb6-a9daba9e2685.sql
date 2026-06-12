ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS cover_focal_x numeric(4,3) CHECK (cover_focal_x IS NULL OR (cover_focal_x >= 0 AND cover_focal_x <= 1)),
  ADD COLUMN IF NOT EXISTS cover_focal_y numeric(4,3) CHECK (cover_focal_y IS NULL OR (cover_focal_y >= 0 AND cover_focal_y <= 1));