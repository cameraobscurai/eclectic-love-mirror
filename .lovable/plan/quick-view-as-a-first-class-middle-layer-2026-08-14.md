# Quick View as a first-class middle layer

Today Quick View exists only inside `/collection`. The opener is a local function in that one route file, the state lives in a `?view=` param that only that route understands, and every other product surface — the PDP's related rails most of all — hard-navigates straight to the full page. That's the fragility: one route owns the feature, and any new grid built anywhere else silently loses it.

This replaces that with a single global Quick View host plus one shared opener hook, and moves the URL onto the real product URL.

## What changes for a visitor

- Clicking any product tile — collection grid, wall, search results, and the two related rails on a product page — opens Quick View in place. No page change, no lost scroll, no lost filters.
- While the modal is open the address bar reads the real product URL (`/collection/ingram-black-leather-wood-sofa-4180`), so copying it shares something meaningful.
- Reloading or opening that copied link lands on the full product page. Nothing depends on a private param.
- Back closes the modal. Back again leaves the page.
- Old `?view=` links keep working — they redirect into the new behaviour.

## URL approach (the "best practice" call)

TanStack Router supports **route masking**: navigate for real to one place while the browser displays a different URL, and on reload the displayed URL wins.

Applied here:

- **Real navigation:** stay on the current route, add a global `peek=<slug>` search param. That keeps the collection's filters, sort, layout, and scroll fully intact, and it works identically from `/collection` or from a product page.
- **Displayed URL:** masked to `/collection/$slug`.
- **Reload / share / crawler:** the mask is not persisted, so the request resolves to the real product page — a full SSR page with its own metadata. No modal-only URL ever escapes into the wild.

This is why the answer isn't "just rename `?view=` to `?peek=`". The param is the transport; the mask is what makes the entry point non-legacy and shareable.

## Steps

1. **Global param.** Register `peek` as a validated search param at the root route so every route can carry it. Default empty string, same `fallback` pattern the collection route already uses.

2. **Shared opener hook** — `src/hooks/use-quick-view.ts`. Exposes `open(slugOrId)`, `close()`, and the current peek slug. `open` resolves an id to a slug (the catalog is already loaded), snapshots scroll and the focused element for focus return, then navigates with `resetScroll: false` and the route mask. `close` uses `replace: true` so open → close → back exits the page instead of reopening the modal. This is the existing `setQuickViewId` logic in `collection.tsx`, lifted out verbatim rather than reinvented.

3. **Route mask** in `src/router.tsx` via `createRouteMask`, mapping a peek navigation to `/collection/$slug`, registered on `routeMasks`.

4. **Global host** — `src/components/collection/QuickViewHost.tsx`, mounted once in `__root.tsx` beside the inquiry tray. It reads `peek`, resolves the product from the catalog, and lazy-renders the existing `QuickViewModal`. The modal component itself is not rewritten.

5. **Prev / next stay list-aware.** The host takes an optional ordered sequence from context. `/collection` publishes its `visibleProducts` so arrows walk the filtered grid exactly as they do now; on a product page there's no sequence, so the arrows hide. No behaviour regression on the grid.

6. **Collection route** drops its local modal mount, local `view` matching, and `setQuickViewId`, and calls the hook instead. The three places that currently clear `view` on filter change clear `peek` instead.

7. **`?view=` compatibility.** The collection route's `beforeLoad` translates a legacy `view` value into a `peek` navigation and strips `view`. Existing bookmarks and any shared links keep working.

8. **Related rails** — `RelatedPieces.tsx` currently uses a raw `<a href={`/collection/${p.slug}`}>`, which is both a hard page load and outside the router. Tiles become buttons that call `open(p.slug)`; the existing hover `+` inquiry control is preserved and stops propagation. The rail header keeps a real `<Link>` to the category.

9. **Search results** need no separate work — they render the same `ProductTile` through the same grid, so they inherit the new opener. Called out so it gets verified, not assumed.

10. **Verification.** Playwright spec asserting: tile click opens the modal without navigating; the displayed URL is the product URL; reload of that URL renders the full page; back closes; a related-rail tile on a product page opens the modal in place; a legacy `?view=` link still opens it. Plus the existing console-health and visual-baseline runs.

## Technical notes

- Files touched: `src/routes/__root.tsx`, `src/router.tsx`, `src/routes/collection.tsx`, `src/components/collection/RelatedPieces.tsx`, new `src/hooks/use-quick-view.ts`, new `src/components/collection/QuickViewHost.tsx`, new spec.
- `QuickViewModal.tsx` keeps its current props; only its mount point moves.
- Body scroll lock, focus trap, and focus return move with the host so they work identically on every route.
- The modal's "VIEW FULL PAGE →" stays the intended exit to the PDP.

## Risks

- **Masking + SSR.** Masks are client-side only. Mitigation: the real target is a real route, so a cold hit always renders the full page. The spec covers cold load explicitly.
- **Two catalog sources.** The collection route loads the catalog; a product page loads one product plus `allProducts` for the rails. The host resolves against whatever the current route already has, and falls back to a full-page link if the slug isn't in memory — never a dead modal.
- **Scroll restoration.** Masked navigations must not trigger the router's scroll restoration. `resetScroll: false` on both open and close, verified in the spec.
