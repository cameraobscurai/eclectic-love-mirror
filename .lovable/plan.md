# Full Mobile Pass — Phase 1 (revised)

Re-audited the codebase. Removing work that's already done, adding gaps I missed, and grounding library choices in what's actually installed (Tailwind v4 + framer-motion v12).

## What's already correct (do not redo)

- Filters sheet has drag handle, spring open, drag-to-dismiss with velocity check, 44px close, and bottom CTA. Solid.
- Mobile nav drawer already uses 44px hit rows and locks body scroll.
- Home hero band is already responsive via `clamp()`.

## Phase 1 — Ship now

### 1. Mobile category cards (the explicit ask)

`src/components/collection/CategoryGalleryOverview.tsx`

- Aspect ratio: mobile `aspect-[5/4]` (landscape, ~35% shorter row), `sm:aspect-[4/5]` from `sm` up. Result on a 390-wide viewport: 2 cols × ~4 rows above the fold instead of ~2 rows. Silhouettes stay generous because card width is unchanged.
- Tighten only the mobile spacing: outer wrapper `p-4` → `p-3 sm:p-4`; grid `gap-4` → `gap-3 sm:gap-4`; image inset `p-5 sm:p-6` → `p-3 sm:p-5`.
- Frosted label: shrink to `padding: 8px 10px` and font-size `9px` on mobile (Tailwind arbitrary), keep `10px` `sm:` and up. Keep tracking `0.18em` and ALL CAPS per typography memory.
- Add `loading="eager"` only to first 4 cards on mobile (current code does first 6, fine for desktop) — saves bandwidth on mobile data.

### 2. Quick-view modal — real swipe-to-dismiss (the actual gap)

`src/components/collection/QuickViewModal.tsx`

- Mobile only (gate via `useIsMobile()`): wrap the white stage in a `motion.div` with `drag="y"`, `dragConstraints={{ top: 0, bottom: 0 }}`, `dragElastic={{ top: 0, bottom: 0.4 }}`, and an `onDragEnd` that closes when `info.offset.y > 140` or `info.velocity.y > 500` (mirrors the filters sheet thresholds, industry-standard iOS sheet feel).
- Add a top drag handle pill (visual affordance, matches the filters sheet).
- Respect `useReducedMotion()` — disable drag entirely.
- Keep desktop modal behavior untouched (it's centered, not a sheet).

### 3. Touch + scroll standards (cheap, high impact)

- `overscroll-behavior: contain` on:
  - filters sheet panel body (`overflow-y-auto` div)
  - quick-view stage scroll container
  - inquiry tray scroll region
  - mobile nav drawer
  Stops pull-to-refresh and parent-scroll bleed — the single biggest "feels like a webpage, not an app" tell.
- `touch-action: manipulation` on all interactive buttons in product tiles and category cards. Removes the 300ms tap delay on legacy webviews and prevents accidental double-tap zoom on tiles.
- `-webkit-tap-highlight-color: transparent` on `body` (in `styles.css`) — kills the blue flash on iOS taps. We already have custom focus-visible rings.
- `inert` attribute on `<main>` when filters sheet, quick-view, or nav drawer is open. Modern, single-line replacement for manual focus traps; supported in all evergreens since 2023.
- Confirm minimum 44×44 hit area on the small "×" close in inquiry tray and any chip rows in the rail.

### 4. Safe-area + viewport correctness

- `<meta name="viewport">` already exists; verify it includes `viewport-fit=cover` so the bottom CTA on iOS Safari doesn't get clipped by the home indicator.
- Add `padding-bottom: env(safe-area-inset-bottom)` to:
  - filters sheet bottom CTA bar
  - inquiry tray
  - mobile nav drawer footer
- Use `100dvh` (already used in QuickViewModal) anywhere we currently rely on `100vh` for full-height surfaces — prevents the iOS Safari address-bar collapse jump.

## Phase 2 — Foundations (next round, scoped, no install yet)

- **Tailwind v4 container queries**: Tailwind v4 ships `@container` natively. Migrate card grids to container queries (`@max-md:aspect-[5/4]`) so the same component lays out correctly when it lives inside a sidebar vs. full-width. Cleanup, no new deps.
- **View Transitions API**: progressive enhancement for category → product navigation (`document.startViewTransition`). No-op on unsupported browsers; zero deps.
- **Stick with framer-motion v12 for gestures**. It already powers drag-to-dismiss correctly; adding `@use-gesture/react` would be a second gesture system. Skip.
- **Route-state preservation**: keep mobile filter sheet state in URL search (already partly there via `view`), so back/forward feels native.

## Phase 3 — Per-route mobile audit (after Phase 2)

Walk every route at 360 / 390 / 414, file issues per route (gallery scroll rail momentum, atelier team grid, contact form keyboard avoidance, FAQ accordion focus rings), ship as one polish PR.

## Files touched in Phase 1

- `src/components/collection/CategoryGalleryOverview.tsx` — aspect ratio, padding, label sizing.
- `src/components/collection/QuickViewModal.tsx` — mobile drag-to-dismiss, drag handle, safe-area.
- `src/components/collection/InquiryTray.tsx` — overscroll-behavior, safe-area, hit areas.
- `src/routes/collection.tsx` — `inert` on main when overlays open, safe-area on sheet footer.
- `src/components/navigation.tsx` — `inert`, overscroll-behavior, safe-area on drawer footer.
- `src/styles.css` — `-webkit-tap-highlight-color: transparent` on body, `touch-action: manipulation` utility usage.
- `src/routes/__root.tsx` — confirm/add `viewport-fit=cover` in viewport meta.

No new dependencies. All changes use Tailwind v4 + framer-motion v12 (already installed) plus native browser features (`inert`, `dvh`, `env(safe-area-inset-*)`, `overscroll-behavior`, `touch-action`).

## What changed from the previous plan

- Removed: drag handle on filters sheet (already exists), drag-to-dismiss on filters sheet (already exists), proposing `@use-gesture/react` (redundant with framer-motion v12).
- Added: real swipe-to-dismiss on the quick-view modal (actual gap), `inert` for modal background, `touch-action`, `-webkit-tap-highlight-color`, `viewport-fit=cover`, `env(safe-area-inset-bottom)`, `100dvh` audit.
- Grounded: container queries called out as Tailwind v4 native (no plugin), gesture work consolidated on framer-motion (no second lib).
