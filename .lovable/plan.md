# Move category nav up to a horizontal bar (when a category is selected)

## Goal
When the user picks a category, the left sidebar rail goes away and the category list appears as a horizontal nav row right under the utility bar — same visual register as the "By Type / Sort / density" controls. Wraps to a second line if needed (no horizontal scroll, ever).

## Behavior
- **Overview screen (no category, no search):** unchanged — left "the HIVE" image plate + tonal grid, no rail, no top bar.
- **Category active (or search active):** 
  - Top horizontal category bar appears, sitting in the same banded/utility-bar area as the search/sort row.
  - 18 categories, uppercase 10px tracked labels, `flex-wrap` so they wrap to a 2nd line on narrow widths instead of scrolling.
  - Active category: charcoal text + 1px charcoal underline. Inactive: charcoal/55, hover charcoal.
  - Left `<aside>` with `<CollectionRail>` is removed in this mode; the right pane goes full-width.
  - Mobile filters sheet trigger remains for the secondary filter dimensions (vendor, materials, etc. — anything that's still in the sheet beyond categories).

## Files

**`src/routes/collection.tsx`**
1. Inside the utility-bar block (the `{(activeGroup || q.trim()) && ...}` div, around L588–725), add a second sub-row beneath the existing flex row containing the new horizontal category nav. Source from `BROWSE_GROUP_ORDER` + `BROWSE_GROUP_LABELS` (already imported area). Click handler: `selectGroup(id)`. Same `var(--archive-canvas-max)` width constraint.
2. Change the body grid (L737–743) so the non-overview branch becomes a single full-width column — drop `lg:grid-cols-[220px_minmax(0,1fr)]`, just use `grid-cols-1`.
3. Delete the non-overview `<aside>` block (L755–770) that renders `<CollectionRail>`. Keep the overview `<aside>` (left hero plate) untouched.
4. Remove the now-unused `CollectionRail` import if no other reference remains. (The mobile sheet still uses it via `variant="sheet"` — verify before removing; if so, keep the import.)

## Out of scope
- Sticky behavior of the new top bar (it scrolls naturally with the utility bar, matching current behavior).
- Reordering categories or renaming labels.
- Touching the mobile filter sheet's category list.
- Counts next to category names (deliberately omitted, per current rail convention).
