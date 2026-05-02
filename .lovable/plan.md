## Goal

Make `/collection` use a pure white page background and pure white product cards, so the transparent-PNG product photos sit on white instead of the current cream (`#f5f2ed`). Match the look of `eclectichive.com/inventory`.

## Scope

- **Only** `src/routes/collection.tsx`.
- **Not touched:** navigation, footer, home page, other routes, design tokens in `src/styles.css` (cream stays the global brand baseline — only this page goes white).
- **Not touched:** any data, server functions, CSVs, storage, or DB.

## Changes (all in `src/routes/collection.tsx`)

1. **Page shell** (line 177): `bg-cream` → `bg-white`.
2. **Sticky filter bar** (line 195): `bg-cream/95` → `bg-white/95`. Borders stay charcoal/10 for the thin divider line.
3. **Active category pill** (line 355): keep `bg-charcoal text-cream` (the dark pill on white reads correctly — same as your reference site's "ALL" pill).
4. **Product card** (line 389): already `bg-white` — keep. Tighten border from `border-charcoal/8` to `border-transparent` and only show a hairline border on hover (`hover:border-charcoal/15`) so cards float clean on white the way the eclectichive.com inventory page does. Image well (line 391) stays `bg-white`.
5. **Quick View modal** (lines 458–459): `bg-cream` → `bg-white` for the panel and sticky header. Backdrop stays charcoal/70.
6. **Quick View thumbnail wells** (line 513): already `bg-white` — keep.
7. **Quick View "Add to Inquiry" button selected state** (line 551): `bg-cream text-charcoal border-charcoal` → `bg-white text-charcoal border-charcoal` so the "added" state reads on white.
8. **Inquiry tray** (lines 581, 594): the floating tray stays `bg-charcoal text-cream` (it's an overlay, looks correct against any page color), but the inner "View Inquiry" button `bg-cream` → `bg-white` for consistency.

## What stays cream

- Global CSS tokens in `src/styles.css` (other pages, nav, footer continue to use the cream brand baseline).
- Charcoal text everywhere — no contrast changes.
- The dark inquiry tray overlay.

## Out of scope (explicit no-ops)

- No image swaps. The Squarespace CDN URLs stay in place. The transparent PNGs will now read on white instead of cream — that's the whole point.
- No manifest run, no storage reads, no DB writes.
- No nav/footer color changes. If you want those white too, that's a separate decision (they appear on every page, not just `/collection`).
- No layout, grid, sort, filter, or behavior changes.

## Verification after applying

- `/collection` page background pure white.
- Product tiles white, transparent-PNG products read clean on white (matches your `eclectichive.com/inventory` screenshot).
- Sticky filter bar still legible, charcoal divider still visible.
- Quick View modal opens on white.
- Inquiry tray still readable.
- No console errors, no layout shift.
