-- Reference: collections
CREATE TABLE public.taxonomy_collections (
  slug text PRIMARY KEY,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.taxonomy_collections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.taxonomy_collections TO authenticated;
GRANT ALL ON public.taxonomy_collections TO service_role;

ALTER TABLE public.taxonomy_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Taxonomy collections are publicly readable"
  ON public.taxonomy_collections FOR SELECT USING (true);

CREATE POLICY "Staff manage taxonomy collections"
  ON public.taxonomy_collections FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- Reference: categories (one collection each)
CREATE TABLE public.taxonomy_categories (
  slug text NOT NULL,
  collection_slug text NOT NULL REFERENCES public.taxonomy_collections(slug) ON UPDATE CASCADE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_slug, slug)
);

CREATE UNIQUE INDEX taxonomy_categories_slug_key ON public.taxonomy_categories (slug);

GRANT SELECT ON public.taxonomy_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.taxonomy_categories TO authenticated;
GRANT ALL ON public.taxonomy_categories TO service_role;

ALTER TABLE public.taxonomy_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Taxonomy categories are publicly readable"
  ON public.taxonomy_categories FOR SELECT USING (true);

CREATE POLICY "Staff manage taxonomy categories"
  ON public.taxonomy_categories FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE TRIGGER update_taxonomy_collections_updated_at
  BEFORE UPDATE ON public.taxonomy_collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_taxonomy_categories_updated_at
  BEFORE UPDATE ON public.taxonomy_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Declared assignment columns on inventory_items
ALTER TABLE public.inventory_items
  ADD COLUMN collection_slug text,
  ADD COLUMN category_slug_v2 text;

ALTER TABLE public.inventory_items
  ADD CONSTRAINT inventory_items_taxonomy_pair_fkey
  FOREIGN KEY (collection_slug, category_slug_v2)
  REFERENCES public.taxonomy_categories (collection_slug, slug)
  ON UPDATE CASCADE;

CREATE INDEX inventory_items_collection_slug_idx ON public.inventory_items (collection_slug);
CREATE INDEX inventory_items_category_slug_v2_idx ON public.inventory_items (category_slug_v2);

-- Seed: 10 collections, slugs derived from existing live nav group params
INSERT INTO public.taxonomy_collections (slug, label, sort_order) VALUES
  ('lounge-seating', 'Lounge Seating', 1),
  ('lounge-tables',  'Lounge Tables',  2),
  ('cocktail-bar',   'Cocktail + Bar', 3),
  ('dining',         'Dining',         4),
  ('tableware',      'Tableware',      5),
  ('lighting',       'Lighting',       6),
  ('textiles',       'Textiles',       7),
  ('rugs',           'Rugs',           8),
  ('styling',        'Styling',        9),
  ('large-decor',    'Large Decor',   10);

-- Seed: 33 categories exactly as declared in the spreadsheet
INSERT INTO public.taxonomy_categories (collection_slug, slug, label, sort_order) VALUES
  ('lounge-seating', 'sofas-loveseats',  'Sofas + Loveseats', 1),
  ('lounge-seating', 'lounge-chairs',    'Lounge Chairs',     2),
  ('lounge-seating', 'benches',          'Benches',           3),
  ('lounge-seating', 'ottomans',         'Ottomans',          4),
  ('lounge-tables',  'coffee-tables',    'Coffee Tables',     1),
  ('lounge-tables',  'side-tables',      'Side Tables',       2),
  ('lounge-tables',  'consoles',         'Consoles',          3),
  ('cocktail-bar',   'bars',             'Bars',              1),
  ('cocktail-bar',   'cocktail-tables',  'Cocktail Tables',   2),
  ('cocktail-bar',   'community-tables', 'Community Tables',  3),
  ('cocktail-bar',   'storage',          'Storage',           4),
  ('cocktail-bar',   'bar-stools',       'Bar Stools',        5),
  ('dining',         'dining-tables',    'Dining Tables',     1),
  ('dining',         'dining-chairs',    'Dining Chairs',     2),
  ('dining',         'banquettes',       'Banquettes',        3),
  ('tableware',      'dinnerware',       'Dinnerware',        1),
  ('tableware',      'flatware',         'Flatware',          2),
  ('tableware',      'glassware',        'Glassware',         3),
  ('tableware',      'serveware',        'Serveware',         4),
  ('lighting',       'chandeliers',      'Chandeliers',       1),
  ('lighting',       'table-lamps',      'Table Lamps',       2),
  ('lighting',       'floor-lamps',      'Floor Lamps',       3),
  ('lighting',       'specialty',        'Specialty',         4),
  ('textiles',       'pillows',          'Pillows',           1),
  ('textiles',       'throws',           'Throws',            2),
  ('textiles',       'furs-pelts',       'Furs + Pelts',      3),
  ('rugs',           'rugs',             'Rugs',              1),
  ('styling',        'accents',          'Accents',           1),
  ('styling',        'candlelighting',   'Candlighting',      2),
  ('styling',        'crates-baskets',   'Crates + Baskets',  3),
  ('large-decor',    'structures',       'Structures',        1),
  ('large-decor',    'walls',            'Walls',             2),
  ('large-decor',    'other',            'Other',             3);