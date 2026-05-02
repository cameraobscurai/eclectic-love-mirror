Good plan. Here's exactly how to build it.

---

### Library choices — locked

**Framer Motion** — already in the project, keep it. Use it for exactly two things in this build: the `layout` spring on `motion.ul` when the grid reflowing, and `AnimatePresence` wrapping the main pane's two render modes (overview ↔ category). Nothing else.

**No new libraries.** The plan doesn't need them. Every interaction here — scroll-spy, intersection observer, sticky positioning, layout — is either already built or is native browser API.

---

### Build order — do not deviate

This sequence matters because each step is independently shippable and reversible.

**1. Delete first.** Remove `CollectionIndexStrip`, `CollectionFilterRail`, and the scroll-compression block (`heroScale`, `heroOpacity`, `heroY`, `stickyMarkOpacity`, `useScroll`, `useTransform`) before writing a single new line. A clean file is easier to reason about than one with dead code alongside new code. Confirm the page still renders after deletion — it will, just unstyled.

**2. Build** `CollectionRail` **in isolation.** Don't touch `collection.tsx` yet. Build the rail as a standalone component that accepts `orderedGroupIds`, `activeGroup`, `onSelect`, `spyActiveGroup`, and `products` (for thumbnail sourcing). Test it in a throwaway route or Storybook if you have it. The mobile sheet variant is just the same component with a `variant="sheet"` prop that changes padding and removes the sticky positioning.

**3. Wire the static** `THE COLLECTION` **heading.** One element, no animation, no hooks. Cormorant, `clamp(60px, 8vw, 120px)`. Sits above the two-column layout in the DOM, outside the grid. When `activeGroup` is truthy, render a second line beneath it — the category label in Cormorant at smaller scale. This is conditional rendering, not animation.

tsx

```tsx
<div style={{ padding: '32px 40px 24px' }}>
  <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(60px, 8vw, 120px)', fontWeight: 400 }}>
    THE COLLECTION
  </h1>
  {activeGroup && (
    <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(20px, 2vw, 32px)', color: 'rgba(26,26,26,0.55)', marginTop: '4px' }}>
      {BROWSE_GROUP_LABELS[activeGroup]}
    </p>
  )}
</div>
```

**4. Build** `CategoryHero`**.** Stateless component. Takes `group`, `product` (the first product with a primaryImage), `count`. No hooks inside it. The specimen image is a plain `<img>` with `loading="eager"` and `fetchpriority="high"` — it's above the fold, treat it that way.

**5. Replace the 3-column cage in** `collection.tsx`**.** Swap to 2-column. Mount `CollectionRail` in both render modes. Mount `CategoryHero` in category mode. This is the riskiest edit — do it last so you have stable components to drop in.

---

### The four things that will go wrong

**1.** `layout` **+** `layoutId` **on** `motion.li` **will murder the rail swap.** When the main pane switches from overview to category, `AnimatePresence` will try to reconcile all 876 `layoutId` registrations. This is the bug from the audit. It must be fixed before this build ships — remove `layoutId` from `ProductTile`. Keep `layout`. Do this in step 1 alongside the other deletions.

**2. The sticky utility bar will fight the static heading.** Today the utility bar sticks to `top: var(--nav-h)`. With a static heading above it, `top` needs to be `calc(var(--nav-h) + {heading height})`. But heading height is variable (`clamp` + optional second line). The clean fix: wrap the heading + utility bar in a single element, make the utility bar sticky inside that wrapper with `top: var(--nav-h)`, and let the heading scroll away naturally. Do not try to compute dynamic offsets.

Actually — simpler: make the entire `THE COLLECTION` block `position: sticky; top: 0` with the nav above it. Then the utility bar sticks below that. Stack them. Each sticks at its natural position in the stacking order.

css

```css
.collection-heading { position: sticky; top: var(--nav-h); z-index: 15; background: var(--cream); }
.utility-bar { position: sticky; top: calc(var(--nav-h) + var(--heading-h)); z-index: 10; }
```

Use a CSS custom property `--heading-h` set via a `ResizeObserver` on the heading element. One observer, one property, no recalculation loop.

**3. Rail thumbnails will cause layout shift.** Each `28×20` thumbnail is an `<img>` with `loading="lazy"`. On first paint, if the image hasn't loaded, the cell collapses then jumps. Fix: set explicit `width={28} height={20}` attributes on every rail thumbnail `<img>`. Always. The browser reserves space before the image loads. This is the single most common cause of CLS on this kind of rail.

**4. The** `AnimatePresence` **wrapping overview ↔ category will stagger wrong.** If you wrap the main pane switch in `AnimatePresence` with `mode="wait"`, you get the "stuck frame" the audit flagged. If you use no mode, both states render simultaneously during the transition. The right call for this specific case: don't use `AnimatePresence` for the overview ↔ category switch at all. Use conditional rendering with a CSS opacity transition on the incoming content only — `opacity: 0 → 1` over `150ms`, no exit animation. The rail staying constant is enough visual continuity. The content swap doesn't need motion.

tsx

```tsx
<div
  key={activeGroup || 'overview'}
  style={{ animation: 'fadein 150ms ease-out' }}
>
  {showOverview ? <CategoryGalleryOverview /> : <CategoryView />}
</div>

// In CSS:
@keyframes fadein { from { opacity: 0 } to { opacity: 1 } }
```

CSS animation, not Framer. No JS in the critical path.

---

### Quality bars before shipping

**No layout shift.** Run Lighthouse or open DevTools Performance tab and record a navigation to `/collection`. CLS score must be 0. If it's not, the culprit is almost always an `<img>` missing explicit dimensions. Fix every one.

**Rail thumbnails must be real on launch.** The plan says fallback to `firstProduct.primaryImage` per group — that's correct and ships today. But test every one of the 18 groups. Some groups may have products where `primaryImage` is null or the CDN URL returns a 404. The `onError` handler must hide the thumbnail cell entirely (not show a broken image) — same pattern as `ProductTile`'s `onImageFailed`.

**Cormorant must be loaded before paint.** If Cormorant Garamond isn't in the document `<head>` as a preloaded font, the `clamp(60px, 8vw, 120px)` heading will flash in system serif first. Check `__root.tsx` — the font link should have `rel="preload" as="font"`, not just `rel="stylesheet"`. If it's Google Fonts, add `&display=swap` and accept the FOUT, or self-host and preload.

**Mobile sheet must get** `CollectionRail` **not the old** `CollectionFilterRail`**.** Easy to miss in a refactor. Ctrl+F for every import of `CollectionFilterRail` — there are two, one in the main layout and one in the mobile sheet. Both get replaced.

`BROWSE_GROUP_DESCRIPTIONS` **copy must be written before the component ships.** `CategoryHero` will render an empty `<p>` if the description map isn't populated. Write all 18 one-sentence descriptions in `collection-taxonomy.ts` as part of this PR, not a follow-up. They're one line each. Do not ship a component with a visible empty slot.

---

### One decision the plan leaves open — make it now

The plan says the `THE COLLECTION` heading renders `THE COLLECTION / Sofas` when a category is active. That second line is the category label. The plan doesn't specify whether clicking that label clears the category. It should. Make the category label a `<button>` that calls `selectGroup("")` — it becomes a one-click breadcrumb back to overview. No separate "← ALL CATEGORIES" link needed (the plan has one in the rail header — keep that too, but the heading label being clickable is a better affordance).