# scripts/backup/

Defensive backup of every Squarespace-hosted product image we still
reference, before Squarespace can take it away.

## Run order

1. `node scripts/backup/download-squarespace.mjs`
   - Downloads every Squarespace URL in `inventory_items.images` to:
     - `/mnt/documents/squarespace-backup/<key>` (cold copy)
     - `squarespace-mirror` bucket at `<key>` (hot copy)
   - Idempotent: skips files already present locally + in the bucket.
   - Outputs `out/download-{manifest,failed,summary}`.
   - **Touches no DB rows.** Safe to run anytime.

2. `node scripts/backup/supabase-orphans.mjs`
   - Lists every object in our buckets, diffs against every URL referenced
     by `inventory_items`, the historical scrape tables, and the few
     repo files that hardcode image URLs.
   - Outputs `out/orphans.{json,csv,summary.txt}`.
   - **Report only.** Does not move, rename, or delete anything.

3. `node scripts/backup/swap-urls.mjs` (dry run)
   - Reads `download-manifest.json`, plans rewrites of every Squarespace
     URL in `inventory_items.images` to its mirrored bucket URL.
   - Writes `out/swap-plan.json` + `out/swap-summary.txt`.
   - Refuses to apply if any download failed (use `--allow-partial` to
     override).

4. `node scripts/backup/swap-urls.mjs --apply`
   - Same plan, written to the DB in batches of 50.
   - Writes `out/swap-applied.json`.

## Env

Uses `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from the sandbox env
(already present — same vars `scripts/mirror-images.mjs` uses).
