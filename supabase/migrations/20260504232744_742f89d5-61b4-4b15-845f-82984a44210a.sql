DROP INDEX IF EXISTS public.inventory_items_rms_id_key;
ALTER TABLE public.inventory_items ADD CONSTRAINT inventory_items_rms_id_unique UNIQUE (rms_id);