## Diagnosis  
  
Yes, that's the right fix. The diagnosis is correct and the architecture change is sound.

The core insight — **rule belongs on the tile, not the route** — is exactly right. Route-level overrides are always going to miss cases (All view, search, future filters) because the route doesn't know what's in the grid. The tile knows what it is.

Two small things worth double-checking when you implement:

**1.** `getProductBrowseGroup` **returns the right value for mixed-category items** If any product is filed under a parent category rather than a subcategory (e.g. `seating` instead of `sofas-loveseats`), it'll miss the set and get default padding. Worth a quick console.log on Phillipe specifically after the change to confirm the group resolves correctly.

**2.** `object-bottom` **+ padding interaction** `p-[14%]` adds padding on all four sides, but `object-bottom` anchors the subject to the bottom. The bottom padding will create a gap between the subject and the tile floor, which might look floaty for furniture that needs a ground plane. You may want `pb-[6%] pt-[14%] px-[14%]` instead — more air on top to shrink tall-backs, less on the bottom to keep furniture grounded.

Otherwise ship it. The table comparison makes the case clearly — fewer lines, works everywhere, mirrors the architecture that already works in the wall view. That's a clean refactor.

Earlier fix put the `--archive-tile-media-h` override on the **grid container**, gated by `activeSubcategory ∈ {sofas-loveseats, benches, beds}`. So:

- ✅ Works in `/collection?...&subcategory=sofas-loveseats`
- ❌ Doesn't fire in the parent **All** view (`subcategory=all`) — Phillipe's tall-back silhouette dominates its cell

The wall view (`CollectionWallTile.tsx`) already solved this correctly: per-tile `padClass` based on the product's own browse group, not the route's subcategory.

## Fix — port the per-tile padding model into `ProductTile.tsx`

Drop the route-level CSS-var override entirely. Each tile decides its own padding from its own browse group, so it normalizes in every view (All, parent, sub, search, future filters).

### `src/components/collection/ProductTile.tsx`

```tsx
import { getProductBrowseGroup } from "@/lib/collection-browse-groups";

const WIDE_LOW_GROUPS = new Set(["sofas-loveseats", "benches", "beds"]);
```

Inside the component:

```tsx
const group = getProductBrowseGroup(product);
const padClass = group && WIDE_LOW_GROUPS.has(group) ? "p-[14%]" : "p-3 sm:p-4";
```

Apply on the `<img>` (line 183):

```tsx
className={`absolute inset-0 h-full w-full object-contain object-bottom ${padClass} will-change-opacity`}
```

Note: 14% (not 18%) because the main grid box is taller than the wall tile box, so the same visual ratio needs slightly less pad.

### `src/routes/collection.tsx` (lines 1176–1184)

Delete the conditional `style` block. The grid no longer needs to know about subcategory:

```tsx
className={`grid ${gridCols} ${gridGapClasses} items-start [grid-auto-rows:max-content]`}
```

(no `style` prop)

## Why this is correct, not a band-aid


| &nbsp;                         | Old (grid-level)            | New (tile-level)                       |
| ------------------------------ | --------------------------- | -------------------------------------- |
| Where rule lives               | Route, gated on subcategory | Product, gated on its own browse group |
| Works in parent All view       | No                          | Yes                                    |
| Works in search results        | No                          | Yes                                    |
| Works in future filters        | No                          | Yes                                    |
| Mirrors wall-tile architecture | No                          | Yes                                    |
| Lines of code                  | More                        | Less                                   |


## Phillipe specifically

Phillipe's loveseat in the screenshot is a tall-back silhouette in the `sofas-loveseats` browse group → after fix, it gets `p-[14%]`, subject shrinks ~25%, sits on the same optical baseline as the long-low Chesterfield + black tufted next to it.

## Not changing

- `--archive-tile-media-h` default (240–340px) — stays.
- Any other category's padding — only WIDE_LOW gets the boost. If we later notice another silhouette class needs it (e.g. tall floor lamps look small), add to the set.
- Wall tile — already correct, no change needed.