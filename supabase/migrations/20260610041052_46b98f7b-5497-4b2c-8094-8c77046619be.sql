ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS editorial_order INT NULL;

CREATE INDEX IF NOT EXISTS inventory_items_editorial_order_idx
  ON public.inventory_items (editorial_order)
  WHERE editorial_order IS NOT NULL;