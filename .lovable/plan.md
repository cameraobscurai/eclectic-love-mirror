# Collection Density + De-duplication Pass

Two changes. Both confined to the Collection page.

---

## 1. Overview grid — denser, smaller cards, less product zoom

**File:** `src/components/collection/CategoryGalleryOverview.tsx`

You're right that square + 6-wide is overcorrected. Switch to denser columns + slightly portrait aspect so the silhouette has natural breathing room without becoming the whole tile.

- Columns: `grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6`
  - 2 / 3 / 5 / 6 — never 4 (you said 4 makes products feel too big). On very wide screens 6 holds; we don't push to 10/12 because at 6 the tile is already ~180px wide and 12 would make silhouettes thumbnail-sized.
  - For genuinely huge monitors (2xl+, 1920px+) we add a denser fallback. Want me to push to `2xl:grid-cols-8`? Tell me yes/no after seeing the next screenshot.
- Aspect: replace `auto-rows-fr` + `min-h-[260/280/300]` chain with `aspect-[4/5]` (gentle portrait, not the square I tried).
- Image padding inside each card: `p-5 sm:p-6` (was `p-4 sm:p-6`). Slightly more interior margin so the silhouette doesn't visually crowd the card edge.
- Gap stays `gap-4` (16px). The white between cards is what carries the luxe pacing.

Net effect: more cards visible per row, each card a touch shorter than current portrait, silhouette ~55% of the tile (not the 40% it is now, not the 80% the square version produced).

---

## 2. Stop repeating the category name

In the screenshot, "Tableware" appears **three times** within one screen height: heading breadcrumb, utility bar meta, and CategoryHero H2. Plus the eyebrow "HIVE SIGNATURE COLLECTION" duplicates the page title "THE COLLECTION" sitting 100px above it.

Resolution: **the heading owns the category label. Everything below it is silent unless the user is searching.**

### a) Remove the breadcrumb under "THE COLLECTION"
**File:** `src/routes/collection.tsx` (lines 528–546)

Delete the `{activeGroup && (<button>…)}` block entirely. The rail on the left already shows the active category with its left-border indicator and Cormorant active state. We don't need a second affordance to return to overview — clicking "BROWSE BY CATEGORY" header in the rail already does that (line 86–101 of CollectionRail).

### b) Remove the CategoryHero entirely
**File:** `src/routes/collection.tsx` (wherever `<CategoryHero ... />` is rendered)

Remove the import and the render. The hero is the single biggest source of redundancy:
- "HIVE SIGNATURE COLLECTION" eyebrow → already implied by the page title
- "Tableware" H2 → already in the rail (active state) and was in the breadcrumb we just removed
- Description copy → soft and pretty but reads as filler when the user came here to browse

If we want the description back later, it can move into a quiet hover state on the rail or a "i" affordance — not a 200px banner above the grid.

### c) Utility bar meta line
**File:** `src/routes/collection.tsx` (line 435–445)

Currently: shows category name when a group is active, or N results when searching.

Change: only show text when actively searching. Empty when browsing a category.

```ts
let resultMeta: string;
if (trimmedQ) {
  const n = visibleProducts.length;
  resultMeta = `${n} ${n === 1 ? "result" : "results"} matching "${trimmedQ}"`;
} else {
  resultMeta = "";
}
```

The category name is in the rail. We don't need to print it again above the grid.

### d) Product tile hover tooltip
**File:** `src/components/collection/ProductTile.tsx` (lines 137–155)

The frosted glass label that appears on hover and shows the product title — keep it. That's the actual product name, not a repeated category name, and it's the only place desktop users learn what they're looking at. Hover-only, opacity 0 at rest. Not a "tooltip-esque" repeat — it's the name itself.

Mobile caption below the tile (lines 159–167) — also keep, it's the only label on mobile (no hover).

---

## What the page reads as after this

- Wordmark: **THE COLLECTION** (always)
- Sticky utility bar: search · sort · density. No category name. No count unless searching.
- Left rail: `BROWSE BY CATEGORY` header, then list with one row in active state showing "Tableware" in Cormorant.
- Right pane: just the grid of pieces. Silhouettes on white, soft shadow, no banner above.

The category name appears exactly once on the page, in the rail, where it's also the active control. Clean.

---

## Files

- `src/components/collection/CategoryGalleryOverview.tsx` — column count, aspect, padding
- `src/routes/collection.tsx` — remove breadcrumb under wordmark, remove `<CategoryHero />` render and import, simplify `resultMeta`
- `src/components/collection/CategoryHero.tsx` — left in place but unused; deleting the file too if no other route imports it (will check on entry)

## Out of scope

Rail, ProductTile hover label, mobile caption, sticky utility bar layout, color, shadow, radius. All untouched.

## Verification

After change, screenshot the Tableware-selected state and confirm:
- "Tableware" appears exactly once (in the rail).
- No banner / hero / eyebrow above the grid.
- Utility bar shows search · sort · density only — no left-side label.
- Overview grid: 5 columns at md, 6 at xl, gentle portrait cards, silhouette occupies ~55% of tile.
