# Quick View: one exit, and only one

Make it obvious that Quick View is a peek and that "VIEW FULL PAGE" is the single control that leaves the page — then close the last control that still navigates away behind the user's back.

## What changes

**1. Modal reads as a peek**

- Top bar left eyebrow becomes `QUICK VIEW · {CATEGORY}` so the surface names itself.
- Footer link becomes `VIEW FULL PAGE →` in caps (matches the site-wide caps rule; it is currently sentence case) with an `aria-label` of "View the full page for {title}".
- Under the two CTAs, one micro-line: `ESC TO CLOSE` — nothing more.
- The full-page link keeps its outlined, secondary treatment; ADD TO INQUIRY stays the filled primary. Only the outlined one exits.

**2. Gallery "Shop the look" stops hard-navigating**

- Its tiles are currently `<a href="/collection/{slug}">` — the last product control on the site that jumps to a PDP. They become Quick View openers, same as collection tiles and the PDP related rails.
- The rail publishes its own items to the Quick View catalog so the modal can resolve them and PREV/NEXT walks the rail.
- The INQUIRE toggle under each tile is unchanged.

**3. No tile cue**

- Per your call, the collection grid stays exactly as it is at rest and on hover.

**4. Verification pass**
Confirm nothing else on a product surface leaves the page:

- Collection grid tiles, wall tiles, related rails, gallery rail → Quick View only.
- Remaining intentional links stay: inquiry tray (BUILD A STYLE BRIEF, REVIEW INQUIRY), related-rail "See all {category}", the empty-state back link, and admin-only links. These are navigation by intent, not accidents.
- Playwright check: click a product tile on `/collection` and on a `/gallery/{slug}` page, assert the URL path is masked but the page never unmounts; click VIEW FULL PAGE and assert a real PDP load.

## Technical notes

- `src/components/collection/QuickViewModal.tsx` — eyebrow text, footer link copy/aria, `ESC TO CLOSE` line. The link stays a plain `<a>` on purpose: the URL is already masked to `/collection/{slug}`, so a client `<Link>` to the same path can no-op.
- `src/components/gallery/ShopTheLookRail.tsx` — swap `<a>` for `<button onClick={openQuickView(p.slug)}>`, add `useQuickView()` + `usePublishQuickViewCatalog(items)`. Items come from `current_catalog.json`, so they already match the shape the host resolves against.
- No routing, catalog, or data changes. No new files.

## Risk

Low. The gallery rail change is the only behavior change; if the published catalog misses a slug the host falls back to nothing and the tile does nothing — so the Playwright check on a real gallery page is the gate before this ships.
