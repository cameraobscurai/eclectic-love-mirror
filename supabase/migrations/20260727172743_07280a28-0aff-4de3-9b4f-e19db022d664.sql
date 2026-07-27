CREATE OR REPLACE FUNCTION public.inventory_items_enforce_admin_only_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.slug IS DISTINCT FROM OLD.slug
     OR NEW.meta_title IS DISTINCT FROM OLD.meta_title
     OR NEW.meta_description IS DISTINCT FROM OLD.meta_description
     OR NEW.og_image IS DISTINCT FROM OLD.og_image
     OR NEW.manual_injection IS DISTINCT FROM OLD.manual_injection
     OR NEW.rms_id IS DISTINCT FROM OLD.rms_id THEN
    RAISE EXCEPTION 'Only admins can change slug, SEO fields, or rms_id';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_items_admin_only_fields ON public.inventory_items;
CREATE TRIGGER trg_inventory_items_admin_only_fields
BEFORE UPDATE ON public.inventory_items
FOR EACH ROW EXECUTE FUNCTION public.inventory_items_enforce_admin_only_fields();