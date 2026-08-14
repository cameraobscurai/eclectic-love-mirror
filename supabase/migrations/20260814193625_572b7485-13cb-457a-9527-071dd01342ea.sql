CREATE OR REPLACE FUNCTION public.rollback_variant_family(
  _family_id uuid,
  _prev_option_name text,
  _prev_members jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _touched integer := 0;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.product_families
     SET option_name = _prev_option_name,
         updated_at = now()
   WHERE id = _family_id;

  -- Restore the snapshotted members that are still in this family.
  WITH prev AS (
    SELECT (m->>'id')::uuid AS id,
           NULLIF(m->>'variant_label', '') AS variant_label,
           NULLIF(m->>'family_position', '')::int AS family_position
      FROM jsonb_array_elements(COALESCE(_prev_members, '[]'::jsonb)) AS m
  ), upd AS (
    UPDATE public.inventory_items i
       SET variant_label = p.variant_label,
           family_position = p.family_position
      FROM prev p
     WHERE i.id = p.id
       AND i.family_id = _family_id
    RETURNING 1
  )
  SELECT count(*) INTO _touched FROM upd;

  -- Any member that joined the family after the snapshot must not keep a
  -- label the restored axis no longer explains.
  UPDATE public.inventory_items i
     SET variant_label = NULL,
         family_position = NULL
   WHERE i.family_id = _family_id
     AND i.id NOT IN (
       SELECT (m->>'id')::uuid
         FROM jsonb_array_elements(COALESCE(_prev_members, '[]'::jsonb)) AS m
     )
     AND (i.variant_label IS NOT NULL OR i.family_position IS NOT NULL);

  RETURN _touched;
END;
$$;

REVOKE ALL ON FUNCTION public.rollback_variant_family(uuid, text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.rollback_variant_family(uuid, text, jsonb) TO authenticated, service_role;

-- Repair the one family left in a half-rolled-back state: axis cleared but
-- member labels still set.
UPDATE public.inventory_items i
   SET variant_label = NULL,
       family_position = NULL
  FROM public.product_families f
 WHERE i.family_id = f.id
   AND f.option_name IS NULL
   AND (i.variant_label IS NOT NULL OR i.family_position IS NOT NULL);