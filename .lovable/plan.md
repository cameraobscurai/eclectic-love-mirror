## Diagnosis

Mapping is healthy. The broken tiles are a **delivery** problem, not a data problem.

| Check | Result |
|---|---|
| DB inventory_items public_ready | 864 |
| DB with at least one image | 860 (99.5%) |
| DB public_ready missing images | 4 (2 large-decor, 1 styling, 1 tables) |
| Baked catalog products | 630 (after family rollup) |
| Baked catalog with image URLs | 630 / 630 (100%) |
| Random sample of 40 live image URLs | **11 returned HTTP 429** (Supabase Storage rate-limited) |

What's happening: the Collection wall renders 100–155 tiles for a single category in one pass. They all hit `wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/...` in parallel. Supabase Storage's public origin throttles bursts → 429 → browser paints a broken-image icon and never retries. Pillows look worst because the category is the largest (155).

This is why it "used to be 99%" — the catalog **is** still 99%+; it's the bytes that aren't arriving.

## Fix plan

### 1. Stop the bleed today (low-risk, no schema change)
- **`src/components/collection/CollectionWallTile.tsx`** — add a single retry-with-backoff on `<img onError>` (one retry after 1.5–3s jitter). Catches 429s without spamming.
- **Lazy + decode async on every tile** — confirm `loading="lazy"` and `decoding="async"` are set everywhere catalog images render (CollectionWallTile, CollectionGridTile, lightbox thumb strip). This alone cuts initial burst dramatically.

### 2. Throttle the burst (small refactor)
- Cap concurrent in-flight image loads to ~12 via an IntersectionObserver gate in the wall component, so off-screen tiles wait their turn. No virtualization library — just don't set `src` until the tile is within ~1.5 viewports.

### 3. Cure the root cause (next pass)
- Route images through **Supabase Storage's image transform endpoint** (`/render/image/public/...?width=...`). Transform responses are cached aggressively at the edge and don't share the raw-object rate bucket.
- Or: put Cloudflare in front of `wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/*` and let the CDN absorb bursts. Free tier handles this trivially.

### 4. Backfill the genuinely missing 4
- Tag the 4 DB rows in `/admin/bind` for owner review. Either drop them from public or upload an image. Not urgent — 4 of 864 is 0.5%.

## What I am NOT proposing
- No catalog rebake. The catalog is fine.
- No bucket churn. The buckets and URLs are correct.
- No removing the family rollup or changing display counts.

## Order of operations
1. Step 1 today (15 min, ship immediately).
2. Step 2 same session (30 min).
3. Step 3 as a follow-up after we confirm Steps 1–2 dropped the 429 rate on a live sample.
4. Step 4 whenever the owner has 4 photos.
