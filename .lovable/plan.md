# Re-ground the Collection on real current inventory

## What the email is telling us

The site's Collection currently renders the **baked Phase 3 CSV** (`src/data/phase3/phase3_final_products.csv` → 824 public-ready items) which was scraped from the public Eclectic Hive site. The owner says ~90% of that is **gone**. Truth = the `04.17 Current Inventory Export` spreadsheet you just sent: **845 items, 7 columns, 16 product groups**.

We have to replace the catalog with this spreadsheet, keep the design and IA, and land it before Wednesday.

## What's in the spreadsheet (verified)

- 845 unique rows · columns: `Id, Name, Current Stock, Product Group, (W" x D" x H") Dims, Image Url, Country of Origin Code`
- Groups (truth set): Tableware 173 · Pillows 119 · Seating 102 · Styling 90 · Tables 76 · Serveware 53 · Bars 49 · Throws 42 · Large Decor & Dividers 28 · Lighting 27 · Rugs 26 · Candlelight 17 · Chandeliers 16 · Storage 11 · Subrentals 10 · Furs & Pelts 6
- `Current Stock` is mostly an integer but can be the string `"Inquire"`
- `(W" x D" x H") Dims` is free-text (e.g. `92"W x 24"D x 41"H`, `12'W x 26"D x 43.5"H`) — 136 rows have no dims
- `Image Url` is a **pre-signed AWS S3 URL that expires in ~3 hours** (10 rows have no image) — we cannot link to these directly from the site; we must mirror them into Lovable Cloud storage **immediately** during import
- `Country of Origin Code` is empty for all rows — ignore

## Strategy

Lowest-risk path that hits the deadline: keep the existing Collection rendering pipeline, but **swap the underlying data** to the spreadsheet. We mirror images into the existing `inventory` storage bucket, write the canonical record into the `inventory_items` table (the right long-term home), and emit a new baked JSON the Collection reads from on first paint. No changes to the visual design, no UX rework.

```text
XLSX (845 rows)
  │
  ├── parse + normalize → category slug, dimensions (W/D/H cm), stock_int|"inquire"
  │
  ├── download signed S3 image → upload to Lovable Cloud storage
  │     bucket: inventory   path: rms/{rms_id}.{ext}
  │
  ├── upsert into public.inventory_items (rms_id is the natural key)
  │
  └── emit src/data/inventory/current_catalog.json   (baked snapshot for SSR)
                          │
                          ▼
              Collection page reads this instead of phase3_final_products.csv
```

## Steps

1. **Schema touch-up (one migration)**
   - Add `rms_id text unique` to `inventory_items` so the spreadsheet's `Id` column is the import key (idempotent re-imports).
   - Add `quantity int` and `quantity_label text` (so we can store `2` *or* `"Inquire"`).
   - Add `dimensions_raw text` (preserve owner's exact string, e.g. `12'W x 26"D x 43.5"H`).
   - Keep existing `width_cm / depth_cm / height_cm` populated when parseable; leave NULL when not.
   - Indexes on `category` and `status`.

2. **Category mapping (locked at import)**
   ```
   Tableware              → tableware
   Pillows                → pillows-throws
   Throws                 → pillows-throws
   Seating                → seating
   Styling                → styling
   Tables                 → tables
   Serveware              → serveware
   Bars                   → bars
   Large Decor & Dividers → large-decor
   Lighting               → lighting
   Rugs                   → rugs
   Candlelight            → candlelight
   Chandeliers            → chandeliers
   Storage                → storage
   Furs & Pelts           → furs-pelts
   Subrentals             → EXCLUDED from public Collection (these are vendor items)
   ```
   Final public count after exclusion: ~835 items.

3. **Image migration (must run while signed URLs are valid)**
   - One-shot Node script (run from `code--exec`) iterates the 845 rows.
   - For each row with an image: `fetch(signedUrl) → arrayBuffer → supabase.storage.from('inventory').upload('rms/{id}.{ext}', body, { upsert: true })`.
   - Detect content-type from the response header; default to `.png` (the URLs in the sheet are `.png`).
   - Resulting public URL = `{SUPABASE_URL}/storage/v1/object/public/inventory/rms/{id}.png` — stable, no expiry.
   - Log failures to `/tmp/image_import_failures.json` and report counts.

4. **Row import**
   - Same script, after each successful image upload, upserts into `inventory_items`:
     - `slug` = `slugify(name)-{rms_id}` (guarantees uniqueness; name collisions exist)
     - `title`, `category`, `dimensions_raw`, parsed `width_cm/depth_cm/height_cm`
     - `quantity` = integer when parseable, else NULL · `quantity_label` = `"Inquire"` when string
     - `images = ['{publicUrl}']`, `status = 'available'`
   - Categories not in our map (`Subrentals`) → `status = 'draft'` so RLS hides them from the public.

5. **Bake snapshot for SSR**
   - After the import, run a small Node script that selects all public rows and writes `src/data/inventory/current_catalog.json` (single array, lightweight: `id, slug, title, category, dimensions_raw, quantity, quantity_label, image`).
   - This keeps Collection's first paint instant (no roundtrip) and matches the existing pattern.

6. **Re-point the Collection**
   - In `src/lib/phase3-catalog.ts` (and the few callers I traced: `CategoryOverview`, `CategoryIndex`, `InventoryIndexRail`, `ProductTile`, `QuickViewModal`, `collection.tsx`), replace the Phase 3 CSV loader with a loader that reads `current_catalog.json`.
   - Keep the same exported types so call sites don't change shape.
   - Drop the legacy `phase3_*` CSV/JSON files from the import graph (leave on disk for now; we delete after launch).
   - Update the admin dashboard's `buildInventoryStats` to count from the new source.

7. **Admin dashboard tweak**
   - `/admin` already reads inventory; switch its data source to the same `current_catalog.json` (or directly to `inventory_items` via a new server function) and add a "Last imported" timestamp + a per-category truth count vs. previous baked count, so you can verify the swap at a glance.

8. **QA before publish**
   - Per-category counts on `/collection` match the spreadsheet's Product Group counts (minus Subrentals).
   - Spot-check 10 product tiles on desktop + mobile: image loads from `inventory` bucket, dimensions display, quantity shows correctly for both numeric and `Inquire`.
   - Confirm no broken images (failures from step 3 should be zero or a small known list we either re-fetch or mark `draft`).
   - Confirm Gallery, Atelier, Home, Contact are untouched.

## Out of scope for this pass

- No edits to product copy/descriptions — the spreadsheet has none. Tiles will show name + dimensions + quantity only, which matches current minimal styling.
- No image retouching, alt-text generation, or CDN resizing — those can come post-launch.
- No deletion of the legacy Phase 3 CSVs (we just stop importing them). Cleanup can happen after launch confirms parity.

## Risk to call out

The S3 image URLs expire roughly 3 hours after the export was generated. **If the export is older than ~3 hours by the time you approve this plan, I'll need a fresh export from the owner before step 3 will succeed.** Everything else (schema, parsing, page wiring) is safe to do regardless.

## Suggested response to the owner

> Yes — we can rectify this before Wednesday. I'm rebuilding the Collection now against your April 17 export as the source of truth and removing the old scraped items. A short call tomorrow to confirm category mapping and which items (if any) should stay hidden vs. shown would be ideal; otherwise I'll have a preview link by end of day Tuesday for you and the girls to review.

Approve and I'll run it end-to-end.