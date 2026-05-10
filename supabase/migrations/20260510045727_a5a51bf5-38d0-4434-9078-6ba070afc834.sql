ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS images_meta jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.inventory_items.images_meta IS
  'Per-image metadata keyed by image URL. Shape: { "<url>": { "role": "cutout" | "backdrop" | "detail" | "scale" | "context", "alt": "...", "removedBg": true } }. Sidecar to images[] so we never re-order or rewrite the URL array; bake script merges this in.';