## Phase 1 — Hero parallax (mouse-tracked, 2 layers)

Add subtle depth to the homepage hero by tracking pointer position on the hero section and translating the **background image** and **wordmark** in opposite directions via Framer Motion springs. Everything else (CTA bar, gradient wash, sr-only h1) stays untouched.

### Behavior

- **Background image** — moves *with* the cursor (positive depth, soft spring). Feels like the moodboard sits behind glass.
- **Wordmark** — moves *against* the cursor (negative depth, snappier spring). Sells the parallax illusion.
- **CTA bar** — anchored, no motion. This is what makes the parallax above feel "deep."
- Reset to center on `onPointerLeave` so layers don't get stuck off-axis.
- Respect `useReducedMotion()` — when true, skip all motion-value wiring and render the current static hero unchanged.
- Skip parallax on coarse pointers (touch). Detected once via `matchMedia("(pointer: fine)")`. Mobile gets the static hero we already shipped — no `deviceorientation` permission prompt, no battery hit.

### Implementation notes (technical)

File: `src/routes/index.tsx`

1. Import `motion`, `useMotionValue`, `useSpring`, `useTransform`, `useReducedMotion` from `framer-motion`.
2. On the hero `<section>`, attach `onPointerMove` + `onPointerLeave`. Compute normalized offset `(-0.5..0.5)` from `getBoundingClientRect()` so coords stay local to the hero (not window).
3. Two `useMotionValue(0)` for `mx`, `my`. Wrap each with `useSpring`:
   - **Background:** `{ stiffness: 60, damping: 25, mass: 0.6 }` — bumped damping from your suggested 20 to avoid wobble on fast flicks.
   - **Wordmark:** `{ stiffness: 90, damping: 18, mass: 0.5 }` — snappier, different physical tether (asymmetry is the point).
4. `useTransform` to map springs → pixel translations:
   - Background: `±18px` X, `±12px` Y (positive depth, follows cursor).
   - Wordmark: `±10px` X, `±6px` Y, **negated** (counter-moves).
5. Convert the existing `<img>` and wordmark `<div>` to `motion.img` / `motion.div`. Apply `style={{ x, y }}` from the transforms. Keep all existing classes, the `loaded` opacity fade, and the `-translate-y-1/2` on the wordmark inner element (Framer's `x`/`y` compose additively with CSS transforms via the wrapper).
6. `will-change: transform` on the two animated layers only.
7. Gate the whole motion setup behind `if (reduced || !isPointerFine) → render current static markup`. Detect `isPointerFine` once in a `useEffect` with `matchMedia("(pointer: fine)")`.

### What does NOT change

- `home-hero.webp` asset (still single baked composition — Phase 2 territory).
- Existing `loaded` fade-in timing.
- LiquidGlass CTA bar, bottom gradient wash, sr-only h1.
- Route transitions in `__root.tsx`.

### Phase 2 (later, not now)

Separate the hero artwork into real layered plates (back glass / moodboard / front glass / etched wordmark) and add 2 more depth tiers using the same `useTransform` + `useSpring` pattern with different stiffness values per tier. Architecture scales cleanly — just more motion values.
