## Root cause (confirmed)

The catalog isn't broken. Image **delivery** is. Across the four image buckets:

| Bucket | Files | Cache-Control |
|---|---|---|
| `incoming-photos` | 1,267 | **all `no-cache`** |
| `inventory` | 1,332 | almost all `no-cache` |
| `missing-gaps` | 12 | all `no-cache` |
| `squarespace-mirror` | 1,373 | mixed (`no-cache`, 1h, 1y) |

`no-cache` tells the Supabase CDN to revalidate origin on every request. So even routing through the `/render/image/public/` transform endpoint doesn't help — the CDN re-fetches every time, origin throttles, browser paints broken-image icons. That's the 429s I sampled.

This is also why nothing here will be solved by clever React. The fix has to land on the storage objects themselves.

## Plan — best-practice, non-aggressive, site-wide

### 1. Fix the headers (the actual fix)
SQL migration to set `Cache-Control: max-age=31536000` on every existing object in the four image buckets. One-time, idempotent, reversible.

```text
incoming-photos      → max-age=31536000   (1,267 rows)
inventory            → max-age=31536000   (1,332 rows)
missing-gaps         → max-age=31536000   (12 rows)
squarespace-mirror   → max-age=31536000   (1,373 rows; normalize the mixed entries)
```

Effect: Supabase's CDN starts actually caching. Origin requests drop ~99%. 429s effectively retire. Browsers serve from disk cache on repeat views.

Filenames are content-addressable for the most part, but if owner ever needs to replace a file at the same path, she'd re-upload through the admin tool, which we'll wire to set the same header on write (Step 2). For safety we can drop max-age to 1 day for `inventory` (owner-edited bucket) — still wipes the 429 problem, gives same-day refresh on edits. I recommend 1 year on the catalog mirrors, 1 day on `inventory`.

### 2. Make future uploads correct by default
- Audit every `supabase.storage.from(...).upload(...)` call in the repo and add `cacheControl: '31536000'` (or `'86400'` for the editable inventory bucket).
- Targets: scripts in `scripts/`, the `/admin/bind` tool, `/admin/image-qa`, any owner-upload component. ~6 call sites.

### 3. Revert the over-engineering I just shipped
The previous turn added two things that are too aggressive once Step 1 lands:
- **IntersectionObserver gate (`useNearViewport`) in `CollectionWallTile`** — native `loading="lazy"` already does this. Doubling up adds blank-flash on fast scroll and breaks SSR snapshots. Drop it.
- **Cache-busting retry (`?_r=1`)** — defeats the CDN we just turned on. Drop it. Keep the single retry, but reload the SAME url after backoff; the browser will revalidate cleanly.

Net `CollectionWallTile` keeps the only two changes that are actually best practice:
- `withCdnWidth` to route through the transform endpoint
- `srcset` + `sizes` so each tile fetches the right size

### 4. Centralize for the future (small, deferred)
Pull catalog image rendering into one `<CatalogImage>` component used by `ProductTile`, `CollectionWallTile`, `QuickViewModal`, `CategoryOverview`, `CategoryGalleryOverview`, `CategoryTonalGrid`, `CollectionRail`. Today the same `withCdnWidth + srcset + lazy + decoding=async` pattern is copy-pasted in 7 places — when this comes up again (and it will), we'll want one switch to flip. No behavior change.

Not required for the fix. Worth doing in the same PR because the code is already in everyone's head.

### 5. What I'm explicitly NOT doing
- ❌ No Cloudflare in front of Supabase (Step 1 makes it unnecessary; we keep the architecture simple).
- ❌ No service worker / fetch interceptor (over-engineering; opaque failure modes).
- ❌ No catalog rebake (catalog is fine).
- ❌ No bucket consolidation (separate concern; risky).
- ❌ No new dependencies.

## Order of operations
1. **SQL migration** (Step 1) — instant effect on live the moment it runs, no deploy needed.
2. **Revert the IO gate + cache-bust** in `CollectionWallTile` (Step 3).
3. **Upload defaults** in admin tools + scripts (Step 2).
4. **Centralize component** (Step 4) — optional, same PR.

## Risk
- Step 1 is reversible (same migration with `no-cache` reverts it). Worst case: cached version of a replaced image shows for up to 1y; mitigated by Step 2 setting shorter TTL on `inventory` and by the existing admin tools doing `upsert: true` + new filenames for fresh uploads.
- Step 3 is removing risk, not adding it.
- Steps 2 and 4 are mechanical.
