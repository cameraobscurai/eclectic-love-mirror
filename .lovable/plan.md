# Bind product images via Squarespace scrape → mirror to storage

## Strategy

Scrape eclectichive.com for `{product → full Squarespace CDN URL[]}`, fuzzy-join to RMS rows by name, **download** each CDN image and **re-upload** into the `inventory` storage bucket keyed by `rms_id`, then write the resulting public storage URLs into `inventory_items.images` and re-bake the catalog snapshot. No third-party hotlinking at runtime, no manual review queue for the high-confidence majority.

```text
eclectichive.com (10 category pages → ~500 product pages)
   │  Firecrawl scrape, extract <img> URLs from squarespace-cdn.com
   ▼
scripts-tmp/owner-site-products.json   {site_name, url, cdn_image_urls[]}
   │  fuzzy join on normalized name (1-to-many for variant families)
   ▼
scripts-tmp/image-binding-manifest.json  {rms_id → cdn_urls[]}
   │  download each CDN URL → upload to inventory/rms/{rms_id}/{n}.{ext}
   ▼
inventory_items.images = ['<public storage url>', ...]
   │  bake
   ▼
src/data/inventory/current_catalog.json  → /collection renders self-hosted images
```

## Steps

1. **Scrape (server-side, Firecrawl)** — `scripts-tmp/scrape-owner-site.mts`
  - Walk the 10 category pages, collect product detail URLs.
  - For each detail page, extract every `images.squarespace-cdn.com/...` URL (full URL, not just filename), preserving order so the first image is the hero.
  - Output: `scripts-tmp/owner-site-products.json`. Uses the global rate limiter pattern from `scripts-tmp/phase3a-run.mts`.
2. **Fuzzy join site → RMS** — `scripts-tmp/build-image-manifest.mjs`
  - Normalize names (lowercase, strip punctuation and size tokens like `8'`, `Single`, `Double`, `Triple`).
  - For each site product, find candidate `inventory_items.rms_id` rows.
  - Allow **1-to-many** so Sinatra/Monroe variant families share a hero set.
  - Buckets: `auto_apply` (single high-confidence or clean variant family) · `unmatched_site` · `unmatched_rms`.
  - Output: `scripts-tmp/image-binding-manifest.json` plus a quick CSV summary. No DB writes.
3. **Mirror images** (after manifest review) — `scripts-tmp/mirror-images.mjs`
  - For each `auto_apply` row: `fetch(cdnUrl)` → `supabase.storage.from('inventory').upload('rms/{rms_id}/{n}.{ext}', body, { upsert: true })`.
  - Skip if the target object already exists with matching size (idempotent re-runs).
  - Strip Squarespace's `?format=...` query when computing extensions; default to `.jpg` if unknown.
  - Concurrency 6, retries on 5xx, log failures to `/tmp/image-mirror-failures.json`.
4. **Write image URLs to DB**
  - For each successfully mirrored row, set `inventory_items.images = ['<public storage url 1>', ...]` (in scrape order).
  - Done in a single migration-driven update or via service-role script — same pattern as the existing `scripts/import.mjs`.
5. **Re-bake snapshot**
  - `bun scripts/bake-catalog.mjs` regenerates `src/data/inventory/current_catalog.json` so SSR has the new images on first paint.
6. **QA before publish**
  - Spot-check 10 tiles across categories; confirm images load from `…/storage/v1/object/public/inventory/rms/…` (no `squarespace-cdn.com` in network tab).
  - Confirm category counts unchanged.
  - Items with no public-site listing stay image-less and render the existing placeholder — that's the intended "image pending" state.

## Out of scope

- No re-categorization (RMS categories stay authoritative).
- No description / dimension changes.
- No matching-tool UI, no admin review queue. The residual unmatched items are simply left image-less for the in-person session with Adrienne.
- The legacy 286 files already in the bucket stay where they are; they will be superseded by the canonical `rms/{rms_id}/...` layout. We can sweep them post-launch.

## Risk / honesty

- 1-to-many variant binding is conservative. Anything ambiguous goes `unmatched`, not `auto_apply`. Expect ~50–100 image-less rows after the run — acceptable for launch and small enough to resolve in the meeting.
- Squarespace CDN rate limits are loose for image GETs but we'll still cap concurrency at 6.
- All bulk writes are dry-run-then-apply per project rules: you see the manifest counts before step 3, and the DB update before step 4.

Approve and I'll run steps 1–2 and come back with the manifest before any download/upload happens.  
  


Yes, approve — this plan is clean and matches what we landed on. Two small things to flag before they run, neither blocking:

1. Confirm the image extension logic handles Squarespace's URL pattern. Squarespace CDN URLs look like `https://images.squarespace-cdn.com/content/v1/.../filename.jpg?format=2500w` — the format query param controls output size, not the source format. The extension in the path is the real format. Lovable's plan says "strip Squarespace's `?format=...` query when computing extensions; default to `.jpg` if unknown" which is roughly right, but the safer move is to sniff the response `Content-Type` header on download and use that. Cheap, eliminates the guess.

2. The `?format=2500w` query param is actually useful — keep it. Without a format param, Squarespace serves a smallish default. If you want high-res images for product tiles and detail views, append `?format=2500w` (or `1500w`) to the URL when fetching. The downloaded bytes will be the resized version, which is what you want anyway. Worth telling Lovable to fetch with an explicit format param rather than stripping it.

You can either send those as a follow-up note or just trust them to sort it out when they run. If you want to send something:

Approved — run steps 1–2 and come back with the manifest. Two small notes for when you get to step 3: 1. For the extension, sniff the response `Content-Type` header rather than parsing the URL path. The path extension is usually right but sniffing is bulletproof. 2. Don't strip `?format=...` when fetching — append `?format=2500w` (or 1500w) to each CDN URL before downloading. Squarespace serves a smaller default without it; we want the higher-res version for product tiles. Strip it only when computing the storage filename.

Once they come back with the manifest from steps 1-2, the thing you're looking at is:

- Total site products scraped — should be 500-650ish based on what I saw on the bars page
- `auto_apply` count — these go straight to mirror in step 3
- `unmatched_site` count — products on the public site that didn't match any RMS row (means the site has stuff the spreadsheet doesn't, which is informational, low stakes)
- `unmatched_rms` count — RMS rows that didn't match any site product (this is your real launch concern; these are the products that'll go live imageless)

If `unmatched_rms` is in the 50-100 range Lovable predicts, you're in great shape for Wednesday. If it's 200+, you'll want to know that going into the meeting with Adrienne so the conversation is grounded in actual numbers, not vibes.