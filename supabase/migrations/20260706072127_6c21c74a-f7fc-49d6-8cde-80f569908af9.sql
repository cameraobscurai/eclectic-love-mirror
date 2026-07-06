
-- Helper: staff OR admin
CREATE OR REPLACE FUNCTION public.is_staff_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'staff')
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_staff_or_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff_or_admin(uuid) TO authenticated, service_role;

-- Extend inventory_items policies for staff (keep existing admin policies; layer additional)
DROP POLICY IF EXISTS "Staff can view all items" ON public.inventory_items;
CREATE POLICY "Staff can view all items" ON public.inventory_items
  FOR SELECT TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Staff can insert items" ON public.inventory_items;
CREATE POLICY "Staff can insert items" ON public.inventory_items
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Staff can update items" ON public.inventory_items;
CREATE POLICY "Staff can update items" ON public.inventory_items
  FOR UPDATE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- Audit trigger for inventory edits
CREATE OR REPLACE FUNCTION public.inventory_items_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed jsonb := '{}'::jsonb;
  before_snap jsonb := '{}'::jsonb;
  after_snap jsonb := '{}'::jsonb;
  k text;
  ov jsonb;
  nv jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_audit_log (actor_id, entity, entity_id, action, before, after, metadata)
    VALUES (auth.uid(), 'inventory_items', NEW.id, 'insert', NULL,
      to_jsonb(NEW) - 'created_at' - 'updated_at',
      jsonb_build_object('rms_id', NEW.rms_id, 'title', NEW.title));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- diff: only include changed keys
    FOR k IN SELECT jsonb_object_keys(to_jsonb(NEW)) LOOP
      ov := to_jsonb(OLD) -> k;
      nv := to_jsonb(NEW) -> k;
      IF ov IS DISTINCT FROM nv AND k NOT IN ('updated_at') THEN
        before_snap := before_snap || jsonb_build_object(k, ov);
        after_snap := after_snap || jsonb_build_object(k, nv);
      END IF;
    END LOOP;

    -- only log if something meaningful changed
    IF after_snap <> '{}'::jsonb THEN
      INSERT INTO public.admin_audit_log (actor_id, entity, entity_id, action, before, after, metadata)
      VALUES (auth.uid(), 'inventory_items', NEW.id, 'update', before_snap, after_snap,
        jsonb_build_object('rms_id', NEW.rms_id, 'title', NEW.title,
          'fields', (SELECT jsonb_agg(key) FROM jsonb_object_keys(after_snap) key)));
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_items_audit ON public.inventory_items;
CREATE TRIGGER trg_inventory_items_audit
  AFTER INSERT OR UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.inventory_items_audit();

-- Lock down user_roles: only admins can grant/revoke; existing has_role check is admin-only
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());
