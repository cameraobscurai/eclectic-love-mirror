## What changes

`/collection` no longer renders 876 tiles by default. The default landing is a **category gallery** — 18 large image cards, one per browse group. The product grid only ever mounts when the user picks a category (or types a search query). "All Inventory" is removed as a destination because, as you said, no one was actually using it as one.

```text
┌─ /collection (no group) ─────────────────────────────────┐
│  THE COLLECTION                                          │
│                                                          │
│  BROWSE THE ARCHIVE                       18 categories  │
│  ┌────────┐  ┌────────┐  ┌────────┐                      │
│  │ image  │  │ image  │  │ image  │                      │
│  │        │  │        │  │        │                      │
│  └────────┘  └────────┘  └────────┘                      │
│  Sofas  44   Chairs  76   Lighting  48                   │
│  ┌────────┐  ┌────────┐  ┌────────┐                      │
│  │ image  │  │ image  │  │ image  │                      │
│  ...                                                     │
└──────────────────────────────────────────────────────────┘

User clicks "Sofas" → /collection?group=sofas

┌─ /collection?group=sofas ────────────────────────────────┐
│  THE COLLECTION · SOFAS · 44                             │
│  ← All Categories                                        │
│  [filter rail]  [44-piece sofa grid]  [progress rail]    │
└──────────────────────────────────────────────────────────┘
```

## Files

### New

**`src/components/collection/CategoryGalleryOverview.tsx`**
- 18 cards in a 3-col desktop / 2-col mobile grid
- Each card: 4:5 portrait hero (first product in the group with an image, served at `?format=800w`), category name in display type, count, and an "Archive" eyebrow on safety-net categories so the owner-tier hierarchy is still felt
- One image request per card → 18 images total, vs the current 60+ — and they're never stuck behind layout-animated tiles
- Capped stagger (max 360ms), no AnimatePresence, no LayoutGroup

### Edited

**`src/routes/collection.tsx`** — the only structural edit
- Compute `groupBuckets`: `groupProductsByBrowseGroup(products)` once via `useMemo`, then map to `[{ id, products }]` in `BROWSE_GROUP_ORDER`
- New branching at the grid render point:
  - `if (!activeGroup && !q.trim())` → render `<CategoryGalleryOverview>` (no filter rail to the left, no progress rail to the right; full-width canvas — see Layout section below)
  - else → render the product grid as today, just for the one active category or search results
- Sticky wordmark text logic simplified: overview screen says "THE COLLECTION"; category screen keeps the existing "THE COLLECTION · SOFAS · 44" pattern
- Initial batch / load-more constants stay the same — they only matter for the per-category grid now, where the largest bucket (Pillows, 147) is the worst case. Still trim `INITIAL_BATCH` from 60 → 36 since no category needs 60 above the fold

**`src/components/collection/CollectionFilterRail.tsx`**
- Remove the "All Inventory" `FilterRow` at the top
- Add a quiet "← All Categories" return link at the top of the rail (inherits the same uppercase tracking register, but in `text-charcoal/55`, no border-l). Visible only when `activeGroup` is set
- When no group is active (overview screen), the rail isn't rendered at all (see route layout change)

### Untouched
- `CategoryOverview.tsx` and `CategoryIndex.tsx` stay where they are. Not deleted in this pass — they may still be useful for the contact / search surfaces. Just not wired into the route.
- `ProductTile`, `QuickViewModal`, scroll-spy, inquiry tray — no changes
- `phase3_catalog.json`, browse-group rules, sort intelligence — no changes

## Layout: how the canvas reflows

Currently the body is a 3-column cage: `[filter rail | grid | progress rail]`. On the overview screen, the cage collapses to a single full-width column — the gallery doesn't need a filter rail (each card IS the filter) and doesn't need a progress rail (no scroll-spy section to track).

Implementation: keep the same outer cage container (so the hairline frame stays consistent), but conditionally render the rails as `null` and switch the grid columns to `lg:grid-cols-1` when on the overview. The hairline cage keeps the frame intact; only the internal subdivision changes.

## Hero image picking

For each browse group bucket, take `products.find(p => p.primaryImage)?.primaryImage`. The catalog is already sorted by `scrapedOrder` so this is a stable, well-known piece per group. No new data, no manual curation, no risk of the wrong image appearing — it's whatever the first piece in that group is, every time.

If you want to override later (say "Sofas should always lead with the Cammye loveseat"), it's a one-line override map in `CategoryGalleryOverview` — out of scope for this pass.

## Performance impact

- Overview screen: **18 image requests** at 800w (vs 60+ at 750w today)
- Category screen: typically **30–80 tiles** (Sofas 44, Chairs 76, Lighting 48). Pillows 147 and Styling 60 are the only buckets that approach the old size, and both are paginated by Load More
- No more `LayoutGroup` + `AnimatePresence` over 60 tiles on first paint
- No more "All Inventory" sort-intelligence pass (`sortProductsForCollection` over 876 items)

## Out of scope

- Virtualization (option #2). Not needed once nothing renders 876 tiles
- Search-first surface (option #3). Search still works exactly as today
- Reordering or relabeling the 18 categories
- New hero images — uses what's already in the catalog
- Removing the now-unused `CategoryOverview.tsx` (defer; small risk of breaking other consumers)

## What you'll see after

- Land on /collection → instant clean grid of 18 categories, each with one beautiful image. No hangs, no skeletons sitting empty
- Click a category → fast load of just that category's pieces, with the existing rail + progress UI
- "← All Categories" in the rail to come back
- Sticky header always knows where you are: "THE COLLECTION" on the overview, "THE COLLECTION · SOFAS · 44" inside a category
