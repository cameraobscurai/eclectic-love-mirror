# Apply Eclectic Hive Code Notes — Implementation Plan

This plan executes the working rules document verbatim. No deviations, no "improvements." Each change maps 1:1 to a numbered section in the notes.

---

## What changes, in order

### 1. Kill the route-level transition (`src/routes/__root.tsx`)
Remove the `<AnimatePresence>` + `<motion.div key={pathname}>` wrapper around `<Outlet />`. Replace with a bare `<Outlet />`. Drop the now-unused `AnimatePresence` / `motion` / `useReducedMotion` imports if nothing else in the file uses them.

**Why first:** every other perf fix is invisible while the route outlet is still remounting under an animated wrapper.

### 2. Enable preloading at the router (`src/router.tsx`)
- `defaultPreload: "intent"`
- `defaultPreloadStaleTime: 30_000` (currently 0 — re-fetches on every nav)
- Keep `scrollRestoration: true`

### 3. Preload on nav links (`src/components/navigation.tsx`)
Add `preload="intent"` to every `<Link>` in the desktop bar and the mobile drawer.

### 4. Preload on home CTAs (`src/routes/index.tsx`)
The three destination CTAs (Atelier, Collection, Gallery) get `preload="viewport"` — mobile has no hover.

### 5. Add `pendingComponent` to Collection (`src/routes/collection.tsx`)
Add a `CollectionSkeleton` matching the spec exactly:
- Sticky utility bar placeholder at `var(--nav-h)` + `var(--archive-utility-h)`
- Container at `var(--archive-canvas-max)`
- 8-cell hairline grid (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`, `aspect-[4/3]`)

Wire on the route definition: `pendingComponent`, `pendingMs: 0`, `pendingMinMs: 150`.

### 6. Strip `layoutId` + per-filter stagger from `ProductTile` (`src/components/collection/ProductTile.tsx`)
- Remove `layoutId={` + `tile-${product.id}` `}` entirely. Keep `layout`.
- Remove the `Math.min(index * 0.045, 0.42)` stagger. Per the notes' "simpler" recommendation: drop stagger entirely. Reflow is the visual event.
- Drop the `delay: stagger` from the transition object.

### 7. Gate the Collection scroll-driven hero (`src/routes/collection.tsx`)
- Add `useScrollIdle(150)` hook (new file: `src/hooks/useScrollIdle.ts`).
- Apply to the hero motion.div: only set the animated `style` object when `scrollIdle && !reduced`. Otherwise pass `undefined`.

### 8. Fix meta-tag debt (`src/routes/__root.tsx`)
Delete the three Lovable-scaffold strings:
- second `description` containing "Seamless Site Mirror replicates…"
- `og:description` with the same string
- `twitter:description` with the same string

Keep the first real `description` ("Two parts luxe…").

---

## Files touched

| File | Change |
|---|---|
| `src/routes/__root.tsx` | Remove route transition wrapper + meta debt |
| `src/router.tsx` | Add `defaultPreload`, bump `defaultPreloadStaleTime` |
| `src/components/navigation.tsx` | `preload="intent"` on all `<Link>`s |
| `src/routes/index.tsx` | `preload="viewport"` on destination CTAs |
| `src/routes/collection.tsx` | Add `CollectionSkeleton` + wire on Route + scroll-idle gating |
| `src/components/collection/ProductTile.tsx` | Drop `layoutId`, drop filter stagger |
| `src/hooks/useScrollIdle.ts` | **New file** |

---

## What this plan does NOT do

- Does **not** add new motion. The notes are subtractive — every change either removes or quiets something.
- Does **not** touch `QuickViewModal`, `InventoryIndexRail`, `CategoryIndex`, or other components with their own `layoutId` usage that is intra-component (not cross-route shared element). Those are legitimate and stay.
- Does **not** refactor the home parallax. It's the one place in the spec where motion-on-scroll is allowed (it's pointer-driven on a fixed 100dvh hero, not scroll-driven).
- Does **not** retroactively add the `useReveal` reference implementation to existing pages. That's a future-component pattern, not a back-port.

---

## Order of execution (single batch)

All 8 changes go in one pass. They're independent at the file level (only `__root.tsx` is touched twice — transition wrapper + meta — but those are different line ranges). After landing, the next user navigation between Home → Collection should:

1. On hover (desktop) or viewport-entry (mobile), preload the collection chunk + loader data
2. On click, swap routes instantly (no fade)
3. If the chunk somehow isn't ready, paint `CollectionSkeleton` immediately
4. Hydrate the real grid in place — tiles reflow on subsequent filter changes via `layout`, no stagger, no shared-element registration cost

If anything in step 1–4 still feels glitchy after this lands, it's a different bug and we diagnose fresh — not by re-adding the things this plan removes.
