## What I'm changing — and what I'm NOT

**NOT changing:**
- No DB writes. `inventory_items.images` stays exactly as-is.
- No deletes from `squarespace-mirror` or `inventory` buckets — both stay as live fallbacks.
- No re-import, no migration, no edit to Supabase types.
- No change to Lovable's storage browser (it's their UI, outside this repo).

**Changing (additive only):**
- Bake-time URL rewrite in `scripts/bake-catalog.mjs` so every product image in `current_catalog.json` points at the `collection` bucket clone first, with the original URL kept as a fallback field.
- One new manifest file (`scripts-tmp/collection-manifest.json`) listing every confirmed-present file in the `collection` bucket so the bake step never rewrites to a missing path.
- Tiny `<img>`-side change so if the `collection` URL 404s the browser falls back to the original URL automatically.

---

## Why this is the right move

- `collection` already holds a complete clone of every product image (we verified tableware end-to-end last turn; same bake covered all 14 categories).
- Today the catalog points at a mix: 893 supabase `squarespace-mirror` URLs, 314 `images.squarespace-cdn.com`, 4 `static1.squarespace.com`. Every external Squarespace hit costs us a TLS handshake to a host we don't control.
- Rewriting at bake time (not in the DB) means: live site uses our owned bucket → faster + resilient, while the DB still has the originals so nothing is "lost" if we ever need to re-bake.

## The bake step (concrete)

1. Load `collection-manifest.json` (built once via `supabase.storage.from('collection').list(...)` recursively → `{ "tables/aaron-…/01-AARON_Coffee_Table_0.png": true, ... }`).
2. For each product image in the catalog:
   - Compute the expected collection path: `${categorySlug}/${slug}/${exactFilename(originalUrl)}`.
   - If manifest has it → set `image.url` to the `collection` bucket public URL, keep the previous URL on `image.fallbackUrl`.
   - If not → leave the image untouched (no broken rewrites).
3. Print a summary: `rewritten X / Y, fallback Z` so we can see coverage.

## The component fallback (one tiny change)

In the product card / hero `<img>` usage, add `onError` that swaps `src` to `image.fallbackUrl` once. Belt-and-suspenders so a stale manifest never shows a broken tile.

## Speed wins that come for free

- All product imagery served from one origin (`wdyfavzfquegrxklcpmq.supabase.co`) → single preconnect, warm HTTP/2 connection, fewer DNS lookups.
- We can keep using the existing `renderUrl()` transform pipeline (already in `storage-image.ts`) on `collection` URLs to serve right-sized variants. Currently `images.squarespace-cdn.com` URLs go through `withCdnWidth()` — fine, but cross-origin. Unifying eliminates that.

## Dry-run / safety order

1. Build manifest → commit `scripts-tmp/collection-manifest.json` (read-only artifact).
2. Run bake in **report mode** (no write to `current_catalog.json`) → print rewrite summary so you can eyeball coverage before committing.
3. Only after you OK the numbers: run bake for real, regenerate `current_catalog.json`, ship.

## Files touched

- `scripts/bake-catalog.mjs` — add manifest load + URL rewrite + summary log.
- `scripts-tmp/build-collection-manifest.mjs` — new, one-shot manifest builder.
- `scripts-tmp/collection-manifest.json` — new artifact.
- `src/data/inventory/current_catalog.json` — regenerated (only after your OK on the dry-run numbers).
- `src/lib/phase3-catalog.ts` — add optional `fallbackUrl?: string` to `CollectionImage`.
- One product image component — add `onError` fallback. (I'll identify the right one when implementing; likely the shared tile in `src/components/collection/...`.)

## On the Cloud storage previewer

I cannot fix that from this project. It's the Lovable Cloud admin UI rendering `.webp` (and `.png`-served-as-webp) files in its right-hand preview pane — outside our codebase. Files are fine; only the admin preview is misleading. If you want, after this lands I can add a tiny internal `/admin/files` route in your own app that previews bucket contents correctly (uses `<img>`, which handles webp natively). Say the word.
