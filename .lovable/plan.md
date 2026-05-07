# Mirror live Squarespace inventory → dedicated `squarespace-mirror` bucket

## Revised approach (per your feedback)

Two changes from the prior plan:

1. **New isolated bucket** — `squarespace-mirror` (public read, admin write). Keeps owner-uploaded `inventory/` bucket pristine and untouched. If we ever need to wipe the squarespace pull, it's a single bucket drop.
2. **Truth = live site only** — we pull from `eclectichive.com`'s live JSON feeds and only mirror what the site currently shows. Anything no longer on the site is left alone (not deleted, not mirrored).

## Live source

`https://www.eclectichive.com/inventory` redirects to the Lounge nav. The 10 live category indexes (from the site nav) are:

```
lounge · lounge-tables · cocktail-bar · dining · tableware
lighting · textiles · rugs · styling · large-decor
```

Each supports `?format=json-pretty` which returns the canonical product list + per-product detail (title, slug, gallery, body, variants). We already have a working harvester at `scripts/audit/harvest-live-products.mjs` and recent output at `scripts/audit/live-products.json` — we'll re-run it fresh so we're working from today's live state.

## Step 1 — Create the bucket (migration)

```sql
insert into storage.buckets (id, name, public)
  values ('squarespace-mirror', 'squarespace-mirror', true);

-- public read
create policy "Public read squarespace-mirror"
  on storage.objects for select
  using (bucket_id = 'squarespace-mirror');

-- admin write/update/delete
create policy "Admins write squarespace-mirror"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'squarespace-mirror' and has_role(auth.uid(),'admin'));

create policy "Admins update squarespace-mirror"
  on storage.objects for update to authenticated
  using (bucket_id = 'squarespace-mirror' and has_role(auth.uid(),'admin'));

create policy "Admins delete squarespace-mirror"
  on storage.objects for delete to authenticated
  using (bucket_id = 'squarespace-mirror' and has_role(auth.uid(),'admin'));
```

## Step 2 — Refresh live truth (no writes)

`scripts-tmp/sqs-live-harvest.mjs` (thin wrapper around existing harvester):
- Hits each of the 10 category JSON feeds
- For every product: collects `slug`, `title`, `categories[]`, `fullUrl`, `body` (description), `excerpt`, `gallery[]` (full asset URLs at `?format=2500w`), `variants[]`
- Writes `scripts-tmp/sqs-live-truth.json` and a summary `.txt` showing per-category counts, total unique products, total unique image URLs

This is read-only on the live site; no DB or storage writes.

## Step 3 — Build mirror manifest (dry-run, no writes)

`scripts-tmp/sqs-mirror-dryrun.mjs`:
- For every unique gallery URL across the live truth: compute target path
  `<category>/<product-slug>/<NN>-<sanitized-filename>.<ext>`
  e.g. `lounge/indiwin-black-leather-sofa/01-INDIWIN_Sofa_0.png`
  (deterministic, human-readable, easy to spot-check in the bucket UI)
- HEAD each URL — record reachable / 4xx / size / content-type
- Match each live product → existing `inventory_items` row by:
  1. `rms_id`/slug exact (won't match — squarespace uses different slugs)
  2. **normalized title exact** (primary signal, already proven in earlier reconcile work)
  3. fuzzy fallback only logged for review, never auto-applied
- Per-row plan shows `{slug_live, title_live, matched_rms_id, current_images, proposed_images}` where `proposed_images` reorders to put the live hero first then live gallery
- Rows with no DB match are listed separately as "live but unbound" — left for manual review, never silently dropped

Outputs:
- `scripts-tmp/sqs-mirror-manifest.json`
- `scripts-tmp/sqs-mirror-summary.txt` (per-category counts, # to upload, # already-mirrored, # match / no-match, total bytes est.)

You review the summary, spot-check 5–10 rows. Nothing has been written.

## Step 4 — Apply (mirror + rebind)

`scripts-tmp/sqs-mirror-apply.mjs`:
1. For each unique URL: `fetch` → `supabase.storage.from('squarespace-mirror').upload(path, buf, { upsert: true })`. Build `remap: cdnUrl → storageUrl`.
2. Concurrency 4, 100ms gap. ~266 unique URLs (could grow if today's live count is higher) — minutes.
3. For each matched row: rewrite `images[]` using remap (preserve order; live hero stays hero), `update inventory_items set images=$new where rms_id=$rms`.
4. Rows that lose all storage references (because every URL came from squarespace) end up fully on `squarespace-mirror`. Rows that had a mix of owner-uploaded `inventory/` images keep them untouched alongside the new mirror URLs.
5. Writes `scripts-tmp/sqs-mirror-result.json` with per-URL outcome and per-row before/after `images[]` for rollback.

Safeguards:
- `upsert: true` → re-runnable
- Per-URL try/catch → one bad URL doesn't abort
- Per-row try/catch → partial failure is logged, never half-written
- Verification SQL after: `select count(*) from inventory_items where images::text like '%squarespace-cdn%'` should equal **only** the unmatched-row count.

## Step 5 — Re-bake catalog

`node scripts/bake-catalog.mjs` to refresh `src/data/inventory/current_catalog.json`. Visual sweep on `/collection?category=pillows-throws` (heaviest) and `/collection?category=tableware`.

## Out of scope (intentional)

- Does **not** touch the 7 imageless rows (no live source).
- Does **not** rebind 88 falsely-shared heroes (separate taste pass).
- Does **not** delete or alter anything in the existing `inventory` bucket.
- Does **not** add/remove products from DB — only updates `images[]` for live-matched rows.

## Cost
- ~266+ image fetches from squarespace, equal number of uploads to the new bucket (~50–150 MB).
- ~220+ row updates, single column.
- All idempotent. Step 2/3 are pure reads.

Approve and I'll: run the migration to create `squarespace-mirror`, refresh the live truth file, then share the dry-run summary before any uploads or DB writes.
