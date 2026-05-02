This is a navigation and page-structure correction, not a redesign. The motion system, ProductTile internals, Quick View, Load More, image behavior, failed-image hiding, URL state, and 876-count contract all stay exactly as they are.

## What changes

### 1. Remove "All" as a category filter
- Delete the `All (876)` pill from the primary category rail.
- "Overview" is implicit: when no `category` and no `q`, the page renders the inventory overview.
- Keep URL semantics:
  - `/collection` → overview
  - `/collection?category=lounge` → Lounge Seating grid
  - `/collection?q=chair` → global search results
- Reset/“back to overview” affordance: a small `← Back to overview` link near the category title in selected-category mode (and `Reset all` already covers full reset).

### 2. Replace desktop category rail with a wrapping category index
Desktop (`md:` and up):
- No horizontal scrolling. No fade edges. No `scrollIntoView`.
- All 18 categories visible at once, wrapping into multiple rows.
- Same restrained uppercase tracking, just rendered in a wrap layout (`flex flex-wrap gap-x-5 gap-y-2`).
- Active category clearly indicated (charcoal text + underline, same visual vocabulary as today).

Mobile (`< md`):
- Keep the existing horizontal scroll rail (with snap, fade edges, active `scrollIntoView`).
- Mobile still includes "Overview" as the first item to return to `/collection`.

Implementation: render two variants of the rail in `collection.tsx`, gated by Tailwind responsive classes (`md:hidden` for the scroll rail, `hidden md:flex` for the wrap index). Both share the same click handlers and active state, so URL behavior is identical.

### 3. "Browse by Category" index on the overview page
Above the preview bands, render a dedicated category index block:
- Small eyebrow: `BROWSE BY CATEGORY`
- A wrapping list of all categories.
- Each item: display name + count + subtle arrow.
- Layout: `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4` of clean text rows, charcoal-on-white, 1px hairline divider on hover, no card chrome.
- Clicking sets `category` param.

This lives only in overview mode (replaces nothing existing — it's added in the body above the existing `CategoryOverview` preview bands).

### 4. Overview body
No change in concept. Still:
- hero/title
- (new) Browse by Category index
- existing `CategoryOverview` preview bands (heading, count, first 4 products, "View all →")

The `CategoryOverview` component already does this correctly — no edits needed beyond the parent passing the same props.

### 5. Selected-category mode
Unchanged from current behavior:
- subcategory row
- search/sort row
- animated grid (`LayoutGroup` + `AnimatePresence` + `popLayout`)
- Load More (48 / +48)
- count text rules already in place
- Add a small `← All categories` text link above the subcategory row that clears `category` and `sub`.

### 6. Search mode
Unchanged — `q` already filters globally when no category, scoped within category when one is set.

### 7. Header/filter layout cleanup
- The sticky filter header keeps the primary category rail/index.
- In overview mode the sub row + search/sort still render so users can search globally from the doorway.
- Count row stays. In overview mode it reads `876 pieces · browse by category`, which is already correct.

### 8. Files touched
- `src/routes/collection.tsx` — remove "All" pill, render mobile scroll rail + desktop wrap index, add "Browse by Category" block above `CategoryOverview` in overview mode, add small back-to-overview link in category mode, remove desktop-side `scrollIntoView` effect (keep for mobile rail only via a media query check).
- `src/components/collection/CategoryOverview.tsx` — no functional change; may receive a small prop or wrapper for consistency. (Likely no edit.)
- (Optional) extract `CategoryIndex` into `src/components/collection/CategoryIndex.tsx` to keep `collection.tsx` readable. Used by both the desktop sticky rail and the overview "Browse by Category" block (with two visual variants: `compact` for header, `expanded` for overview body).

### 9. What I will NOT touch
- `ProductTile.tsx` (image priority, blur-up, deferred rendering, failed-image hiding)
- `useNearViewport`
- Framer Motion grid wrappers / spring config / stagger
- Quick View modal and URL param
- InquiryTray
- `phase3-catalog.json` and the 876 count
- Sort, search debounce, subcategory facet derivation
- Visual language (colors, type, spacing tokens)

### 10. Acceptance check after change
- `/collection` shows overview with no "All" pill anywhere.
- Desktop shows every category at once, no horizontal clipping, no mouse scroll-strip.
- Mobile still scrolls categories horizontally with snap + active-into-view.
- `/collection?category=lounge` shows the existing animated grid + Load More.
- `/collection?q=chair` shows global search results.
- Public-ready count stays at 876.
- No broken images, no raw slugs, no prices, no cart language.