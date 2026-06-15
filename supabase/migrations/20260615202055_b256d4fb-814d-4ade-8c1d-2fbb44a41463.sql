CREATE TABLE public.gallery_orders (
  gallery_slug text PRIMARY KEY,
  order_keys text[] NOT NULL DEFAULT '{}'::text[],
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT ON public.gallery_orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_orders TO authenticated;
GRANT ALL ON public.gallery_orders TO service_role;

ALTER TABLE public.gallery_orders ENABLE ROW LEVEL SECURITY;

-- Public read: the gallery page applies overrides at runtime for everyone.
CREATE POLICY "gallery_orders public read"
  ON public.gallery_orders FOR SELECT
  USING (true);

-- Only admins can write.
CREATE POLICY "gallery_orders admin insert"
  ON public.gallery_orders FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "gallery_orders admin update"
  ON public.gallery_orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "gallery_orders admin delete"
  ON public.gallery_orders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER gallery_orders_set_updated_at
  BEFORE UPDATE ON public.gallery_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();