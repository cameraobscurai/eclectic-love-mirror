# Quick View: keep your place and your filters

Opening a tile and stepping through PREV/NEXT should never move the page behind the modal or drop the filters you set. Two weak spots today:

- PREV/NEXT reuse the same "open" call, so every step pushes a new history entry and re-runs a masked navigation. Back after five steps means five back presses instead of one close.
- The navigation targets the current route relatively (`to: "."`) while a mask to `/collection/<slug>` is active. Under a mask, relative resolution is not guaranteed to land on the real route, which is how filter/sort params can get dropped mid-sequence.

## What changes

1. **Pin every peek navigation to the real route.** Resolve the current unmasked pathname and current search from router state and navigate to that explicit path with the existing params spread forward, instead of `to: "."`. Filters, sort, category, and page params survive open, prev, next, and close.

2. **PREV/NEXT replace instead of push.** Stepping inside the modal swaps the `peek` value (and the mask) on the current history entry. One back press closes the modal and returns you to the grid at your scroll position, regardless of how many pieces you stepped through.

3. **Capture scroll once, restore once.** The opener scroll position is recorded on the first open and explicitly not re-recorded by prev/next (already guarded — make it explicit and add the same guard on the replace path). Restore stays as-is: `window.scrollTo` plus the Lenis immediate call.

4. **Verify no scroll drift on step.** The modal is mounted under a scroll lock; each prev/next re-navigation carries `resetScroll: false` so the locked body is never nudged.

## Technical detail

- `src/hooks/use-quick-view.ts`: `open` gains an options arg (`{ replace }`), computes `pathname` from `useRouterState` on the real (unmasked) match rather than `to: "."`, and spreads the live search object explicitly. `close` uses the same pathname resolution.
- `src/components/collection/QuickViewHost.tsx`: `onPrev`/`onNext` call `open(slug, { replace: true })`.
- No changes to `QuickViewModal`, the catalog context, or route files.

## Verification

Playwright, headless, on `/collection` with a category filter and a sort applied:

- Scroll mid-grid, open a tile, step next three times, close — assert URL search still has the filter/sort params and `window.scrollY` matches the pre-open value within 2px.
- Assert one back press after three steps leaves the modal closed and stays on `/collection` with filters intact.
