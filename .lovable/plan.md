## Pass 1 — Safe performance cleanup (revised per feedback)

Strict scope unchanged: no layout, styling, motion, copy, gallery behavior, or collection UX changes. No catalog restructuring. No View Transitions. No Web Workers. No state refactor.

Refinements from your review folded in inline (steps 4, 5, 6).

### 1. Fix React 19 preload prop casing

- `src/components/hero-image.tsx` → `heroPreloadLink()`: `imagesrcset → imageSrcSet`, `imagesizes → imageSizes`, `fetchpriority → fetchPriority`.
- `src/routes/index.tsx` → both preload entries: `fetchpriority → fetchPriority`.
- Inline `{...({ fetchpriority: ... })}` JSX spreads on `<img>` in `hero-image.tsx`, `media-aperture.tsx`, `CategoryOverview.tsx`, `CategoryGalleryOverview.tsx`, `ProductTile.tsx`: rename to `fetchPriority`. Keep the cast for older `@types/react` safety.

Pure rename. Removes three console warnings.

### 2. Lazy-load `QuickViewModal`

- `src/routes/collection.tsx` → `const QuickViewModal = lazy(() => import("@/components/collection/QuickViewModal").then(m => ({ default: m.QuickViewModal })))`.
- Wrap the `<AnimatePresence>{quickViewProduct && <QuickViewModal …/>}</AnimatePresence>` in `<Suspense fallback={null}>`.
- `src/components/collection/ProductTile.tsx` → add a one-shot warmer wired to `onMouseEnter` / `onFocus` on the tile button so the chunk is in cache before the click resolves.

### 3. Lazy-load `GalleryMap` behind viewport proximity

- `src/routes/gallery.tsx` → replace top-level import with `lazy(...)`.
- Use `useNearViewport` (rootMargin 400px, initial: false) on the `mapSlot` host div. Render `<Suspense fallback={null}><GalleryMap …/></Suspense>` only once `near` flips true.
- Slot dimensions are CSS-grid driven, so no layout shift.

### 4. Move `CATEGORY_COVERS` preload into the overview branch

> Acknowledged: this is a workaround. TanStack Start's `head()` is route-level, not component-level, so we can't conditionally hoist preloads from a child component into the route head without refactoring the overview-vs-category-detail split into separate routes. That's a Pass-2-or-later decision; for now we keep it imperative.

- `src/routes/collection.tsx` → delete `Object.values(CATEGORY_COVERS).map(...)` from `Route.head()`.
- `src/components/collection/CategoryGalleryOverview.tsx` → add a mount-only `useEffect` that creates `<link rel="preload" as="image" fetchPriority="high">` per cover and removes them on unmount. Documented in a code comment as "TanStack head() can't condition on a child component; revisit if overview becomes its own route."

### 5. Audit and remove confirmed-unused packages

Per your note, I'll do a manual second-pass check on `vaul` and `embla-carousel-react` before running `bun remove` — specifically grepping for any usage in the contact sheet, gallery lightbox, mobile filter sheet, and any modal that might wrap them indirectly. The first scan only matched `src/components/ui/{drawer,carousel}.tsx` themselves, but I'll widen the search to:
- `rg -n "Drawer|Carousel" src/ --glob '!src/components/ui/**'`
- `rg -n "vaul|embla" src/ package.json`

If anything turns up, those two stay and the rest go. Otherwise the full removal list:

`bun remove embla-carousel-react cmdk input-otp react-resizable-panels react-day-picker vaul recharts date-fns @mendable/firecrawl-js`

Then delete the matching `src/components/ui/*.tsx` shells whose deps were removed.

### 6. Fix `GalleryCardsTrack` setState-during-render warning (with mount guard)

Per your refinement — moving the `onActiveChange` notify into an effect would fire on mount with index 0, which the current code doesn't do (it only fires when `prev !== bestIdx`). Add a `useRef` mount guard:

```tsx
const didMountRef = useRef(false);
useEffect(() => {
  if (!didMountRef.current) { didMountRef.current = true; return; }
  onActiveChange?.(activeIndex);
}, [activeIndex, onActiveChange]);
```

And inside `recompute()`, replace the functional updater with a plain `setActiveIndex(bestIdx)`. Net behavior identical to the current code: parent only hears about index changes, never the initial 0.

### Reporting

After running, I'll list every file changed, paste short diffs for steps 4 and 6 (the subtle ones), and report whether the four target warnings are gone.

### Out of scope (deferred)

- Catalog sharding (Pass 2)
- Memory leak / overflow race / SWR LRU cap — flagged for a separate pass before Pass 2 catalog work
- framer-motion / View Transitions (Pass 3)
- Web Workers, `useReducer` consolidation (Pass 4)
- `JSON.parse(?raw)` — skipped
