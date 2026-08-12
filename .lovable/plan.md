# COLLECTION home + real product families

Two jobs. The first is a day's work. The second is structural and gets built in stages so nothing on the live site moves until the structure is proven.

## 1. COLLECTION becomes the admin home

- Rename "Collection photos" to **COLLECTION** in the sidebar and breadcrumbs.
- `/admin` lands on COLLECTION. The old dashboard stays reachable under Dashboard.
- New **ALL** entry at the top of the category list: every piece in one grid, grouped under sticky collection/category headings, small-icon size by default. This is the cross-check view — 636 tiles on one screen instead of one category at a time.
- Drag-to-reorder stays off in ALL (order is per-category); pick a category to reorder.

## 2. Product families

Today there is no such thing as a family in the database. A script guesses them at bake time off the retired Squarespace snapshot: 85 guessed families covering 301 pieces. That is why the editor says "editing a collection" and can't show you what's in it — there is nothing to show.

### The model

Every variant stays a full product record: its own name, photos, quantity, dimensions, notes, price. A family is a new record that ties them together and names the parent.

```text
FAMILY  "Adonis Glassware"          <- cover photo, collection, category
  |- ADONIS RED WINE GLASS    photos · qty · dims · notes
  |- ADONIS WHITE WINE GLASS  photos · qty · dims · notes
  |- ADONIS COUPE GLASS       photos · qty · dims · notes
  +- ADONIS GOBLET            photos · qty · dims · notes
```

- The grid shows one tile per family.
- The product page shows the parent, with a variant row underneath. Picking a variant swaps its photo, dimensions, quantity and notes.
- Every variant keeps a working direct link. `…/adonis-coupe-glass` opens the parent with the coupe already selected, so all 301 existing links survive.

### Converting what exists

The 85 guessed families get written into the database as real families, marked **unreviewed**, with today's grouping preserved. Nothing on the live site changes at that moment. A review filter in COLLECTION lets Adrienne confirm, rename, re-cover, split or merge them at her pace. Anything she never touches keeps working exactly as it does now.

### Admin

- Product editor gains a **Family** panel: which family this piece is in, every sibling with its cover thumb, drag to order, set the family cover, remove from family, break the family apart.
- New Product gains a choice: standalone piece, or a variant added to an existing family — with its own photo upload at creation.

## Order of work

1. Schema for families + convert the 85 existing groups (invisible change).
2. Catalog bake reads families from the database; retire the Squarespace snapshot dependency.
3. Family panel in the product editor + review filter in COLLECTION.
4. Product page variant selector + variant-link redirects.
5. Variant creation in New Product.

Stages 1 and 2 ship together and are verified against the current live grid — same 636 tiles, same covers — before anything else starts.

## Technical notes

- New `product_families` table (title, slug, collection_slug, category_slug, cover_rms_id, source `converted|manual`, reviewed_at) with admin-write / public-read policies and grants. `inventory_items` gains `family_id`, `variant_label`, `variant_order`.
- `scripts/family-rollup.mjs` stops reading `live-inventory-snapshot.json` and reads `product_families`; the snapshot file is retired under the engineering rules (R2 baseline unaffected).
- `mergeCatalog` / `family-cover.ts` keep their cover-precedence logic but source membership from the database instead of inference; existing fixtures in `tests/family-cover.test.ts` extended with a converted-family case.
- Variant URLs resolve in `collection_.$slug.tsx`: a slug that matches a variant loads the parent and preselects it — a redirect, not a duplicate page, so SEO stays on the parent.
- The variant selector moves out of QuickView (now retired from tile clicks) and onto the product page.
