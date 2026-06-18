# New Product Upload — /admin

Today `/admin/incoming` is a dumb file dump into the `incoming-photos` bucket. It never creates a product. This plan adds a real "new product" flow without breaking the existing intake.

## What gets built

**1. New route: `/admin/new-product`** — a single-page form (not a wizard, keep it tight):
- Title
- Category (dropdown of the 14 RMS slugs)
- Quantity, dimensions (optional)
- Image upload + reorder (reuses existing `ImageOrderEditor` pieces)
- Cover focal + card background (reuses `FocalEditor`, `SortableThumb`)
- Publish toggle (`public_ready`)

Submit creates the `inventory_items` row, uploads images to `squarespace-mirror`, then redirects to `/admin/photos` filtered to the new product.

**2. New nav entry** in `admin-shell.tsx` under INVENTORY: "New Product" (above "Incoming photos").

**3. Existing `/admin/incoming` stays** as the bulk-dump triage area. Unchanged.

## The critical safety fix (must ship in same batch)

`scripts/import.mjs:58` retires every row where `rms_id IS NULL` on every RMS re-import. A manual product would vanish on the next inventory sync.

Fix: manual products get `rms_id = 'MANUAL-<short-uuid>'`. The `MANUAL-` prefix never collides with numeric RMS IDs, so the upsert ignores them and the null-sweep skips them. No schema migration, no import-script change required.

The `createInventoryItem` server function generates the prefix server-side — the UI never sees it.

## Technical details

**New server function** `createInventoryItem` in `src/lib/inventory-images.functions.ts` (admin-gated, service-role write):
- Input: `{ title, category, quantity?, quantityLabel?, dimensionsRaw?, publicReady }`
- Generates `rms_id = 'MANUAL-' + crypto.randomUUID().slice(0,8)`
- Generates `slug = slugify(title) + '-' + rms_id.toLowerCase()`
- Inserts with `status: 'available'`, `images: []`, `editorial_order: null`
- Returns the new row's `id` (UUID) so the page can hand it to `ImageOrderEditor`

**Route file** `src/routes/admin.new-product.tsx`:
- `beforeLoad: requireAdminOrRedirect`
- Two-stage UI: (a) metadata form → create row → (b) reveal `ImageOrderEditor` inline against the new UUID
- "Done" button → `router.navigate({ to: '/admin/photos' })`

**Nav** in `src/components/admin/admin-shell.tsx`:
- Add `{ label: 'New Product', to: '/admin/new-product' }` to the `INVENTORY` array
- Add matching `CRUMB_LABELS` entry

**Catalog visibility:** After create + publish, the product appears in the DB immediately but `current_catalog.json` is only refreshed by `scripts/bake-catalog.mjs`. Admin views read the DB live, so the new product shows in `/admin/photos` instantly. Public site shows it on the next bake. Flag this in the success toast: "Live on site after next catalog bake."

## Out of scope

- Editing existing products (already handled by `/admin/photos` + `ImageOrderEditor`)
- Variants/families (manual products are single SKU only for v1)
- Bulk CSV upload
- Color tagging (auto-runs on next color pipeline pass)
- Modifying `import.mjs` or adding a `source` column (the `MANUAL-` prefix sidesteps this)

## Verification

1. Create a test product end-to-end, publish, confirm it appears in `/admin/photos`.
2. Confirm `rms_id` starts with `MANUAL-` in the DB.
3. Dry-run `scripts/import.mjs` against current RMS XLSX, confirm the manual row's `status` stays `available`.

Ready to build?