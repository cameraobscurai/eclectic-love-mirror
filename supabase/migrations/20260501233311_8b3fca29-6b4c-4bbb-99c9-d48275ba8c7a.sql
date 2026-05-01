-- Roles enum and table (separate table to prevent privilege escalation)
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Status enum
CREATE TYPE public.item_status AS ENUM ('available', 'reserved', 'sold', 'draft');

-- Inventory items
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price NUMERIC(10,2),
  status item_status NOT NULL DEFAULT 'available',
  category TEXT,
  -- dimensions & materials
  width_cm NUMERIC(8,2),
  height_cm NUMERIC(8,2),
  depth_cm NUMERIC(8,2),
  weight_kg NUMERIC(8,2),
  materials TEXT[],
  origin TEXT,
  -- images
  images TEXT[] NOT NULL DEFAULT '{}',
  -- seo
  meta_title TEXT,
  meta_description TEXT,
  og_image TEXT,
  -- timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_inventory_status ON public.inventory_items(status);
CREATE INDEX idx_inventory_slug ON public.inventory_items(slug);
CREATE INDEX idx_inventory_category ON public.inventory_items(category);

CREATE POLICY "Public can view non-draft items"
  ON public.inventory_items FOR SELECT
  USING (status <> 'draft');

CREATE POLICY "Admins can view all items"
  ON public.inventory_items FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert items"
  ON public.inventory_items FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update items"
  ON public.inventory_items FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete items"
  ON public.inventory_items FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Inquiries
CREATE TABLE public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  handled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit an inquiry"
  ON public.inquiries FOR INSERT
  WITH CHECK (
    length(name) BETWEEN 1 AND 200
    AND length(email) BETWEEN 3 AND 320
    AND length(message) BETWEEN 1 AND 5000
  );

CREATE POLICY "Admins can view inquiries"
  ON public.inquiries FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update inquiries"
  ON public.inquiries FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete inquiries"
  ON public.inquiries FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for inventory images (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('inventory', 'inventory', true);

CREATE POLICY "Public can view inventory images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'inventory');

CREATE POLICY "Admins can upload inventory images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'inventory' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update inventory images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'inventory' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete inventory images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'inventory' AND public.has_role(auth.uid(), 'admin'));