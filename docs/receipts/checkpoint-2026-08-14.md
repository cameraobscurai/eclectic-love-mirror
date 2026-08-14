# Checkpoint — 2026-08-14

Ten read-only verification agents, one per surface. Everything below is evidence
against code, tests, or the database — not against docs or memory.

## Green (verified working)

| Surface | Evidence |
| --- | --- |
| COLLECTION admin | `/admin` → `/admin/photos` (`admin.index.tsx:15`); single-category default, never ALL (`admin.photos.tsx:76-86,182`); URL-driven state + deep links (`:128-136`); ALL view lazy-loads via IntersectionObserver (`:999+`); drawer opens in place with `seed` (`:964-972`); hidden tiles wash/hatch/badge (`:1126-1156`) and are dropped from the public catalog (`phase3-catalog.ts:407`) |
| Shared drawer | One `InventoryEditDrawer` mounted by both `/admin/products` and `/admin/photos` — no fork. Title, quantity, quantity_label, description, dimensions all save; taxonomy routes to `assignTaxonomy`; `getProduct` selects `*` so nothing is write-only. New-product includes description + quantityLabel |
| Photo + focal editors | Drag-to-cover at position 0; upload validates MIME/size; AUTO/MANUAL/FRAMED badges read real row data; reset + framed-lock work; `frameDelta` threshold 0.01 matches the renderer; `focal-point.test.ts` 10/10 |
| Catalog merge | Admin authority beats family promotion (`family-cover.ts:113`); tombstones filter products *and* variants; `upscaled_cover_url` has zero references in app code and zero non-null rows; `family_option_name` + `images_version` flow through the overlay; `?v=` derives from `updated_at` |
| PDP / share / quickview | ShareButton on the PDP breadcrumb, `navigator.share` → clipboard fallback, absolute `eclectichive.com` URL, `?v=` round-trips; QuickView still wired to `?view=`; `text-foreground` readability fix intact; nav trailing-slash fix intact; leaf `head()` with absolute og:image |
| Access control | Every inventory/family/taxonomy/photo/variant write carries `requireStaffOrAdmin` or `requireAdmin` on top of `requireSupabaseAuth`; no client-supplied identity trusted; RLS on every relevant table |
| Publish/bake | Publish writes an immutable `overlay-<ts>.json` then flips one `manifest.json` pointer; SSR reads baked catalog first, overlay merges on top, silent fallback to baked on failure; no data can be lost between save and publish (edits are durable DB rows) |
| Safety net | `vitest` 66/66, `tsgo --noEmit` clean, `rules:check` all pass, `intake:test` 2/2 |

## Fixed this pass

- **Variant rollback was not atomic.** The undo loop updated the family axis and
  each member label in separate calls; a mid-loop failure left an axis cleared
  with labels still set — and one family (Fiona Bone Flatware, 7 items) was
  actually sitting in that state. Replaced with a single Postgres function,
  `public.rollback_variant_family`, that restores axis + all members in one
  statement and clears labels on rows that joined after the snapshot. Repaired
  the stranded family; stranded rows now 0.

## Open, deliberately not changed

1. **Lighting scale intent.** Memory says lighting is exempt from true physical
   scale and never floor-anchored. Code says otherwise: `lighting` is in
   `REAL_SIZE_CATEGORIES` and its rule is `anchor: "bottom"`. Floor lamps
   arguably *should* be floor-standing, so this needs a human call before a code
   change. `chandeliers` is correctly ceiling-anchored.
2. **`shelfCategorySlug` does not exist.** Zero references repo-wide; sizing
   keys off `categorySlug` with a subcategory second tier. Either the memory
   rule is aspirational or the field was renamed.
3. **Tile-fit harness has rotted.** `scripts/audit/tile-fit-harness.mjs` returns
   0 tiles on every slice — selector/route drift, not a fit regression. It is
   currently a false green.
4. **302 unpublished edits.** Real, legitimate, waiting on a human Publish.
5. **Concurrency.** No advisory lock around variant apply/rollback; two staff
   editing one family at once is last-write-wins.
6. **Coverage gaps**, ranked by blast radius: publish/bake path, variant
   rollback, InventoryEditDrawer, FamilyBoard, ImageOrderEditor.
