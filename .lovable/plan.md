# Per-variant photos

## What exists today (verified in code and the baked catalog)

- 85 family tiles, 301 variant rows. 294 already resolve to a photo, 7 do not, and 1 family has two variants pointing at the same photo.
- A variant's photo is **derived, not declared**: `phase3-catalog.ts:297` takes the variant row's live `images[0]`. Nothing states that rule in the admin, so reordering a row's gallery silently changes its variant photo.
- The admin family panel is **read-only** and reads a build-time JSON file. There is no place to see, set, or verify a variant photo.
- The product page has **no variant switcher at all**. Variant chips and image matching exist only in the old QuickView modal, which is no longer the primary way in. A shopper landing on a family page sees one merged gallery with no labels.
- QuickView's matching falls back to guessing from filenames (numbers like `AKOYA 7.png`, tokens like Fork/Knife). That guess is the thing to remove.

## The model — pointer, not a second photo library

Best practice across Shopify, BigCommerce and Squarespace: one image pool, and each variant holds a **pointer** into it. No parallel image store, no filename inference.

Each variant here is already a full inventory row with its own photos, so the pointer belongs on the row:

```text
inventory_items
  variant_cover_url text null   -- must be one of this row's own images[]
```

- Empty = AUTO (first photo), which is exactly today's behaviour, so nothing moves on day one.
- Set = PINNED. Survives gallery reordering, upscales, and re-imports.
- Same three-state language already used for focal points: AUTO / PINNED, with a reset.
- Deleting the pointed-at photo clears the pointer back to AUTO rather than breaking the tile.

This does not depend on the declared-families work in `docs/product-families-plan.md`. The pointer lives per row and works under today's grouping and under the future one.

## Phases

**1. Schema.** Add `variant_cover_url` plus a validation trigger that rejects a URL not present in that row's `images[]`, and clears it when that image is removed. Existing table, so grants are unchanged.

**2. Bake and runtime.** `bake-catalog.mjs` selects the column; `phase3-catalog.ts` resolves `variant.imageUrl` as `variant_cover_url ?? images[0]`. The family gallery merge is untouched — the variant photo is already in the pool.

**3. Admin — the family board.** Replace the read-only panel inside the inventory drawer with a live board:
   - every sibling as a row: thumbnail, title, dimensions, quantity, AUTO/PINNED badge
   - "Set variant photo" picks from that row's own photos
   - jump straight to a sibling in the same drawer instead of a search link
   - coverage line ("5 of 6 variants have a distinct photo") and two warnings: no photo at all, and two variants pointing at the same photo
   - which member supplies the family's landing image stays explicit

**4. Public — the switcher.** This is the payoff. Add variant chips to the product page: selecting one swaps the hero to that variant's photo and updates the dimensions and quantity shown. Deep-linkable as `?v=<id>`. Inquiry selections carry the chosen variant. Once coverage is complete, delete the filename-guessing fallback in QuickView.

**5. Verification.** Fixtures in `tests/family-cover.test.ts` for pointer precedence and the delete-clears-pointer case; a `variant-photo-coverage` audit script listing the 7 photoless variants and any duplicates; confirm an RMS re-import never clobbers a pointer (rule R6).

## Decisions I made — say if you disagree

- A variant photo must be one of that variant row's own photos. Uploading a photo that belongs to no row would create a second, untracked image store.
- The 7 photoless variants get flagged, not auto-filled from a sibling. A wrong photo is worse than none.
- Landing image for the tile keeps its current rule: the lead row's first photo. Variant photos do not compete for it.

## Sequencing

Phases 1–3 are one working session and change nothing publicly. Phase 4 is the visible change and should land after you have walked the 85 families once in the new board.
