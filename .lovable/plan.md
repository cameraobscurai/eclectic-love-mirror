## Goal

Reskin the Collection landing (`/collection` overview state) to match the reference: a tall **brand panel on the left** ("the HIVE" / big H / chair / SIGNATURE COLLECTION) and a **seamless category grid on the right** with alternating warm/cool tonal backgrounds — one category per cell, product cutout centered, small uppercase label bottom-left.

This only changes the overview state. The category-detail view, search results, mobile sheet, rail, and product grid all keep working as-is.

## Layout

```text
lg+ viewport
┌──────────────────────────┬──────────────────────────────────────┐
│                          │  SOFAS │ CHAIRS │ BENCHES│ COFFEE │ SIDE  │
│        the HIVE          ├────────┼────────┼────────┼────────┼───────┤
│     ┌──────────────┐     │ DINING │  BAR   │STORAGE │LIGHTING│PILLOWS│
│     │     ⎔H⎔      │     ├────────┼────────┼────────┼────────┼───────┤
│     │   [chair]    │     │ THROWS │TABLEWARE│SERVEWARE│ACCENTS│LARGE  │
│     └──────────────┘     │        │         │         │       │ DECOR │
│   SIGNATURE COLLECTION   ├────────┼────────┼────────┴────────┴───────┤
│                          │ COCKTAIL │  RUGS │     STYLING            │
└──────────────────────────┴──────────┴───────┴────────────────────────┘
```

- Left panel: ~38% width on lg, full single image (uploaded `download_14.jpeg`). Cream background, sticky to viewport top under nav so it stays in view while the right grid scrolls if needed.
- Right grid: 5 columns × 4 rows, **gap = 0** (seamless). Each cell is a square-ish tile (~aspect 5/4) with a tonal background from a 3-tone palette repeating in a checkerboard pattern so adjacent cells never share the same tone. Product cutout centered with padding, label uppercase, bottom-left.
- Sub-lg: left panel stacks above grid; grid drops to 3 cols.
- The existing left CollectionRail is **hidden in overview state** on lg+ (the brand panel takes its place). It returns when a category is selected or a search is active.

## Files

**New** `src/assets/collection/hive-signature-hero.jpeg` — copy of `user-uploads://download_14.jpeg`, imported with `?preset=editorial`.

**New** `src/components/collection/CategoryTonalGrid.tsx` — replaces `CategoryGalleryOverview` for the overview state. Renders the 18 browse groups (in `BROWSE_GROUP_ORDER`) as a seamless 5-col grid. Per cell:
- Background tone picked from `["#efece6", "#d9d4cb", "#c8c2b6"]` via `(row + col) % 3` so neighbors differ.
- Centered category hero (uses existing `CATEGORY_COVERS`, `withCdnWidth`, `buildCdnSrcSet`, `useNearViewport`, AVIF/WebP fallback chain — same image-loading discipline as the current overview).
- Bottom-left label: `text-[10px] uppercase tracking-[0.22em]` with cell padding `px-4 py-3`. No frosted glass — sits directly on the tonal field.
- Click selects the group (same `onSelectCategory` contract).
- Keeps the first-row synchronized reveal + later-row cascade from the existing component so the page paints as one beat, not a popcorn flicker.

**Edit** `src/routes/collection.tsx` (overview branch only, ~lines 770–805):
- Wrap the overview state in a new `lg:grid lg:grid-cols-[minmax(0,38%)_minmax(0,1fr)]` layout.
- Left cell: `<HivePanel />` — sticky `top-[var(--nav-h)]`, cream bg, contains the imported hero image (object-contain, full panel height, max ~`calc(100vh - var(--nav-h))`).
- Right cell: `<CategoryTonalGrid groups={overviewGroups} onSelectCategory={...} />`.
- When `showOverview` is true, suppress the `<aside>` rail on lg+ (conditional render). When `showOverview` is false, current two-column rail+grid layout returns unchanged.
- Drop the `CategoryGalleryOverview` import (component file kept on disk for a turn in case we need to revert; remove next pass once approved).

**Memory** update `mem://design/collection-landing` (new) with the tonal palette, grid size, and the rule "overview hides the left rail; rail returns on category/search."

## Technical notes

- Reference image (`download_14.jpeg`) becomes the left panel verbatim — no recomposition. We treat it as a single editorial plate, which matches the owner's reference exactly and avoids font/layout drift.
- Tonal palette is sampled from the reference; neutral warm/cool greys that read on the cream page background. Tuned to brand tokens (cream `#f5f2ed`, sand `#d4cdc4`) so the grid sits inside the existing palette.
- Image loading: cells use `loading="lazy"` except the first row (`fetchPriority="high"`, eager), same as current overview. `useNearViewport` gates later rows to keep the request fanout sane.
- Accessibility: each cell is a `<button>` with `aria-label={label}`; focus ring uses `focus-visible:ring-charcoal/35 ring-inset` so it's visible against any tone.
- Reduced-motion: skip the cascade reveal (instant render).
- No changes to data, sorting, search, quick-view, inquiry tray, or rail. Mobile filter sheet untouched.

## Out of scope

- Re-cropping/recomposing the H + chair as separate vector + photo layers (would require recreating the wordmark; using the supplied plate is faster and matches owner intent).
- Restyling the category-detail (grid) state.
- Changing taxonomy or category labels.
