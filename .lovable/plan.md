## What "liability" means here

Three real risks. The plan addresses all three.

| Risk | Today | Fix |
|---|---|---|
| **Delivery breaks** (429s, broken thumbnails) | 1 of 4 buckets fully recached; 2 still serve `no-cache` | Finish the recache job |
| **Photos get lost** (accidental delete, my mistake, owner mistake) | No backups. If `incoming-photos/` is wiped, it's gone | Nightly manifest + photo archive bucket |
| **Catalog silently drifts** (DB ≠ baked JSON ≠ what's on live) | No automated check. Owner notices broken tiles before we do | Inventory health page + drift detector |

## Plan

### 1. Finish the cache job (10 min)
Two buckets still need the re-upload pass:
- `squarespace-mirror` (1,373 files) → 1y cache
- `inventory` (1,332 files) → 1d cache
- Retry 5 stragglers from `incoming-photos` that hit a db-connection limit

Then delete `scripts/_recache.mjs` (one-shot tool, not a permanent script).

### 2. Backups — the actual liability fix

**2a. Nightly DB manifest** (cheap, high-value)
A server function runs daily and writes a timestamped JSON snapshot of `inventory_items` to a new private bucket `inventory-backups/`. 14-day retention. ~2 MB/day. If the catalog ever gets corrupted I (or owner) can restore exactly which `rms_id` had which `images[]` on any given day.

**2b. Photo archive bucket** (one-time + on-write mirror)
New private bucket `inventory-photo-archive/` that holds a copy of every owner-uploaded original. One-time backfill from `incoming-photos` (~2 GB). Then a tiny server function the `/admin/incoming` uploader calls right after a successful upload to mirror the file. Doubles storage cost; gives true accidental-delete recovery.

**2c. Storage object inventory** (audit trail)
Same nightly job writes a manifest of every object path + size + cacheControl across the 4 image buckets to `inventory-backups/`. Lets us answer "what files existed last Tuesday?" without restoring anything.

### 3. Inventory health page (so we see problems before owner does)

`/admin/inventory-health` — a single read-only dashboard pulling live numbers:
- DB row count, public-ready count, with-images count
- Baked-catalog row count + `generatedAt`
- **Drift alert** if DB count > catalog count by more than 5 rows (signals bake is stale)
- List of the rows that are public-ready but `images = []` (today: 4)
- Random HEAD-check on 30 catalog image URLs → red row if any returns 4xx/5xx
- Bucket file counts vs last night's manifest → red if shrinkage detected
- Last backup timestamp

No interactive controls. Pure observability.

### 4. Guardrails on me (memory rules)

Add to project memory `mem://constraints/inventory-safety.md`:
- Never call `storage.remove()` on more than 5 files without first writing the file list to `/mnt/documents/` and getting explicit approval
- Never re-run a bulk re-upload without a dry-run count first
- Catalog rebake requires confirming DB-vs-baked counts match within ±2 before publishing
- `incoming-photos` is the canonical originals bucket. Never delete a folder there without a manifest. `squarespace-mirror` is legacy/secondary. `inventory` is owner-edit space.
- If I'm ever unsure which bucket a tile pulls from, stop and read `inventory_items.images[0]` for that row instead of guessing

Reference this from `mem://index.md` Core.

### 5. What I'm explicitly NOT doing
- ❌ No CDN swap (Cache-Control fix made this unnecessary)
- ❌ No bucket consolidation (high-risk, low-reward)
- ❌ No move off Supabase Storage
- ❌ No new dependencies
- ❌ No image-bytes deduplication (premature)
- ❌ No centralized `<CatalogImage>` component yet (deferred from last plan — not a liability item)

## Order
1. Finish cache job — silences current symptoms (10 min)
2. Add memory guardrails — protects against future me (2 min)
3. Build `/admin/inventory-health` page — gives visibility (30 min)
4. Wire DB manifest backup server fn + cron — protects catalog (30 min)
5. Photo archive bucket + on-write mirror — protects pixels (45 min)

Items 1–3 in this session. Items 4–5 are the bigger lifts and can ship in the next session if you want to keep this turn tight.

## Risk
- Step 1 is mechanical. Already proven on `missing-gaps` and `incoming-photos`.
- Steps 2 + 3 are additive (new file, new route). Cannot break existing flows.
- Step 4 needs a server-fn cron — no schema change, no migration. Worst case: backup fails silently and we notice in the health page.
- Step 5 doubles photo storage cost. Few GB. Cheap insurance against the scenario that actually scares you.
