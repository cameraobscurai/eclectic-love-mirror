CREATE OR REPLACE FUNCTION public.reorder_inventory_items(p_updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  UPDATE public.inventory_items AS i
  SET editorial_order = (u.item->>'editorial_order')::int
  FROM jsonb_array_elements(p_updates) AS u(item)
  WHERE i.rms_id = (u.item->>'rms_id');
END;
$$;

GRANT EXECUTE ON FUNCTION public.reorder_inventory_items(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_inventory_items(jsonb) TO service_role;