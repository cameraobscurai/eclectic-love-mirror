## Situation

- `inventory_items.images` currently holds **1,555 image URLs** across 848 products.
- **1,156** already live on our Supabase `squarespace-mirror` bucket (safe).
- **399** still point directly at Squarespace CDN (`images.squarespace-cdn.com` × 389, `static1.squarespace.com` × 10) — these go dark the moment Squarespace pulls the plug.
- The `squarespace-mirror` bucket already exists, is public-read, and is what the site already serves the other 1,156 from. Tonight's job is finishing that move.

## Three scripts, run in order, each gated

All scripts go in `scripts/backup/` and reuse existing env (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` from `process.env` — already provisioned in the sandbox; they match what `scripts/mirror-images.mjs` uses).

### 1. `scripts/backup/download-squarespace.mjs` — RUN TONIGHT

Goal: get a cold copy of every Squarespace-hosted image we currently reference, **before** Squarespace can take it away.

- Read `inventory_items` from Supabase (service role, so RLS doesn't filter).
- For each URL in `images[]` whose host is `images.squarespace-cdn.com` or `static1.squarespace.com`:
  - Compute deterministic key: `squarespace/{rms_id}/{sha1(url).slice(0,12)}-{basename}`
  - Download to `/mnt/documents/squarespace-backup/{key}` (cold local backup → survives as a downloadable artifact).
  - In parallel, upload the same bytes to the `squarespace-mirror` bucket under the same key.
  - Skip if the bucket object already exists with matching size (idempotent / resumable).
- Concurrency: 8 in flight, retry-with-backoff on 429/5xx, hard-fail on 404 (logged to `failed.json`).
- Outputs:
  - `scripts/backup/out/download-manifest.json` — `{ rms_id, original_url, bucket_key, public_url, bytes, sha1 }` per file.
  - `scripts/backup/out/download-failed.json` — anything that 404'd or wouldn't download.
  - `scripts/backup/out/download-summary.txt` — totals.
- **Does NOT touch the database.** Pure read + download + upload.

### 2. `scripts/backup/supabase-orphans.mjs` — defensive sweep

Goal: find files sitting in our buckets that no `inventory_items.images` row references — years of disconnected uploads.

- List every object in buckets `squarespace-mirror`, `inventory`, `collection`, `category-covers` (paginate `storage.from(bucket).list` recursively).
- Build the set of all referenced URLs from `inventory_items.images`, plus any image columns on other tables that store image URLs (will discover via schema introspection — `category-covers.ts`, gallery manifests, etc.).
- Diff: every storage object whose public URL is not referenced anywhere.
- Outputs (report only — **no moves, no deletes**):
  - `scripts/backup/out/orphans.json` — full list with bucket, key, size, last_modified, public_url.
  - `scripts/backup/out/orphans.csv` — same, spreadsheet-friendly for owner review.
  - `scripts/backup/out/orphans-summary.txt` — counts per bucket and total bytes.

### 3. `scripts/backup/swap-urls.mjs` — last, after the first two are clean

Goal: rewrite the 399 Squarespace URLs in `inventory_items.images` to point at the freshly mirrored copies.

- Reads `download-manifest.json`. For every row with a Squarespace URL that has a successful manifest entry:
  - Build the new array: replace each Squarespace URL with the matching `public_url` from the bucket; preserve order; preserve any non-Squarespace URLs untouched.
- **Two modes**:
  - Default = dry-run. Writes `swap-plan.json` with `{ rms_id, before, after, diff }` per row + `swap-summary.txt`. Database is read-only.
  - `--apply` = actually `update inventory_items set images = $1 where rms_id = $2` for each planned row, in batches of 50, inside a transaction per batch. Writes `swap-applied.json` log.
- Refuses to apply if `download-failed.json` is non-empty, unless `--allow-partial` is passed.
- Aligns with project rule: destructive bulk ops are dry-run first, reviewed, then applied.

## Run order

1. Tonight, immediately: `node scripts/backup/download-squarespace.mjs` → confirm `download-failed.json` is empty (or acceptable).
2. Any time after: `node scripts/backup/supabase-orphans.mjs` → review `orphans.csv` together.
3. Only after step 1 is clean: `node scripts/backup/swap-urls.mjs` (dry run) → review → `node scripts/backup/swap-urls.mjs --apply`.

## Out of scope

- No Squarespace site crawl beyond the URLs we already reference. (If the owner wants the broader "everything Squarespace will give us" archive, that's a separate, larger script — easy to add as `crawl-squarespace.mjs` later, but not required to protect what's currently wired into our site.)
- No deletes of orphaned files.
- No changes to the live site code or the Collection page.
- No changes to the H aside (the previous task is shipped).

## Verification at each step

- After step 1: bucket file count up by ~399, `download-summary.txt` shows 0 failures, sample 5 random new bucket URLs and confirm they 200.
- After step 2: spot-check 10 orphans by their public URL — they should be reachable but unreferenced.
- After step 3: re-run the host-count query from earlier; expect Squarespace host count to drop to 0 and Supabase host count to rise by ~399.
