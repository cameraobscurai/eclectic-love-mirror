ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS cover_framed_url text,
  ADD COLUMN IF NOT EXISTS cover_framed_meta jsonb;

COMMENT ON COLUMN public.inventory_items.cover_framed_url IS 'Frame Studio derivative: the 1200w WebP URL. The 600w variant is derived by suffix swap (-1200.webp -> -600.webp). Never store the 600w URL here.';
COMMENT ON COLUMN public.inventory_items.cover_framed_meta IS 'Frame Studio composition record (documented, not enforced): { srcUrl, srcHash, bboxPx:[x,y,w,h], method:''auto-alpha''|''auto-color''|''manual'', scale, offsetX, offsetY, canvas:[1500,1200], approved, ruleVersion, generatedAt, advisories:[] }';