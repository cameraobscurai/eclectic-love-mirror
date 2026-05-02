# QuickView — Breakpoint QA + Pretext fit-to-lines

Two-part deliverable. Part 1 audits the current modal at real viewport sizes and locks the remaining layout issues. Part 2 replaces the static `clamp()` font-size with measured fit-to-lines via `@chenglou/pretext`, so every product title lands on the same line count regardless of name length.

---

## Part 1 — Breakpoint QA + remaining layout fixes

### What I'll test
Drive the live preview through these viewports and screenshot the QuickView open on three product types (short title chair, long title sofa, very long title with multiple words):

- 1920×1080 (large desktop)
- 1440×900 (typical laptop) — primary target
- 1280×720 (small laptop)
- 834×1194 (iPad portrait)
- 390×844 (iPhone)

For each: open QuickView → screenshot → zoom into title region, image region, footer seam region. Compare against the Calista reference.

### Known issues from the existing screenshots
1. **Title baseline drift** — `top-4 md:top-6` plus `clamp(2.5rem, 6.5vw, 6.5rem)` means the title sits very close to the top bar at small widths and gets disproportionately small. Reference has the title roughly 1/4 down the stage with generous breathing room from the eyebrow.
2. **Image position too low** — `items-end` + `justify-end` slams products into the bottom-right corner; tall chairs lose their feet behind the footer transition. Reference sits the image lower-center on wide products, lower-right on tall ones.
3. **Mobile**: title and image fight for the same space because the desktop overlap composition doesn't translate. Mobile needs a **stacked composition**: title block top, image below, no overlap.
4. **Footer seam**: `bg-cream/85` with `backdrop-blur-xl` over a cream stage shows a faint band because `backdrop-blur` on opaque-cream-over-opaque-cream still tints. Either drop the blur (footer is over solid cream, blur does nothing useful) or make footer solid `bg-cream` with just the top border.
5. **Long titles still overflow at narrow desktop widths** (1280px) because `max-w-[68%]` of an 1180px stage = ~800px, and "Shotwell Natural Linen Chair" at 6.5rem (~104px) needs more room. This is exactly what Pretext solves in Part 2 — but as a stopgap, drop the clamp ceiling so it shrinks more aggressively until Part 2 lands.

### Part 1 fixes (CSS only, ship before Pretext)
- **Stage padding**: title `top-[12%] left-10`, image container `pt-[18%] pb-6 pr-10` so the two zones interlock with intent rather than colliding.
- **Image positioning**: `items-end justify-end` only on desktop; mobile uses `items-center justify-center` and the title goes above (not behind) the image via mobile-only flex stacking.
- **Mobile reflow**: at `<md`, switch from absolute-overlap stage to a flex-col stage: `flex flex-col`, title (regular block, not absolute) → image (flex-1, object-contain). Drops the cinematic overlap on mobile in favor of a clean stack — same trade most editorial sites make.
- **Footer**: `bg-cream` solid, drop `backdrop-blur-xl` and `bg-cream/85`. Just a `border-t border-charcoal/15`.
- **Title fallback clamp** (until Part 2): widen the range `clamp(2rem, 5.5vw, 5.5rem)` and bump `max-w-[72%]` so even long titles don't clip during the brief unmeasured first paint.

---

## Part 2 — Pretext fit-to-lines title

### Goal
Every QuickView title renders at the **largest font size that wraps to ≤ N lines** in the available stage width — short titles fill big, long titles shrink gracefully, every product feels typeset.

### Why Pretext (not just `clamp()` or a ResizeObserver loop)
- `clamp()` is a viewport curve, not a content-aware fit. A 5-word title and a 1-word title get the same size and look unbalanced.
- DOM-measure-and-shrink loops (`getBoundingClientRect` in a while-loop) trigger forced reflow per iteration — janky on modal open and resize, especially with Framer Motion mid-animation.
- Pretext does the entire binary search **without ever touching the DOM**. README explicitly recommends this pattern: "binary search a nice width value by repeatedly calling walkLineRanges and checking the line count... balanced text layout this way."

### API I'll use
```ts
import { prepareWithSegments, measureLineStats } from "@chenglou/pretext";
```
- `prepareWithSegments(title, fontString)` — one-time per title.
- `measureLineStats(prepared, maxWidth)` → `{ lineCount, maxLineWidth }` — cheap, allocation-free, perfect for binary search.

### Algorithm: `useFitToLines`
A custom hook in `src/hooks/use-fit-to-lines.ts`:

```text
inputs:  text, family, weight, maxWidth, lineHeightRatio,
         minPx, maxPx, targetLines (e.g. 2)
output:  fontSizePx (locked once measured)

1. Wait for document.fonts.ready (Cormorant must be loaded, or measurements lie)
2. Binary search font size in [minPx, maxPx]:
     for size in candidates:
       prepared = prepareWithSegments(text, `${weight} ${size}px Cormorant`)
       stats    = measureLineStats(prepared, maxWidth)
       if stats.lineCount <= targetLines: lower bound up (try bigger)
       else:                              upper bound down (too big)
3. Return the largest size that fits in ≤ targetLines.
4. Memoize keyed on (text, maxWidth) — recompute only when stage resizes
   (ResizeObserver on the stage element, not the title).
```

### Wiring into QuickView
- Wrap the stage in a `ResizeObserver` to track its width.
- Pass `(product.title, stageWidth - paddingX)` to `useFitToLines` with `targetLines = 2`, `minPx = 32`, `maxPx = 128`.
- Apply the returned size as inline `fontSize`. Keep current `clamp()` as the SSR/first-paint fallback so there's no flash.
- Caveat handling: `system-ui is unsafe` per Pretext docs — we use `Cormorant`, a named loaded font. Pass exactly `"Cormorant"` (not the full CSS stack `"Saol Display", "Cormorant", ...`) since Saol isn't loaded; the browser falls back to Cormorant anyway.

### Edge cases handled
- **Font not yet loaded** → hook returns `null`, JSX falls back to the `clamp()` size. No FOUT-driven jump because we re-measure on `fonts.ready`.
- **Stage resize** (window resize, modal open animation) → ResizeObserver re-runs binary search; same `prepared` handle is reused inside one render frame, only `measureLineStats` re-runs (the cheap path).
- **Product change** → `prepared` cache keyed on text, not on size. Title swap reuses if same text length pattern; otherwise prepares fresh (one-time canvas measurement, sub-millisecond).
- **Server-side render** → Pretext requires Canvas + `Intl.Segmenter`. Hook is `useEffect`-gated so it never runs on SSR; SSR ships with the `clamp()` fallback.

### Pretext caveats we respect
- Use named font (`Cormorant`) not `system-ui`.
- Wait for `document.fonts.ready` before first `prepare()`.
- Sync `lineHeight` with CSS `line-height` (we use `0.92` ratio).
- No letter-spacing math needed (we use `tracking-[-0.015em]` ≈ −0.24px at 16px base; pass as `letterSpacing` option to keep measurement tight).

---

## Files touched

| File | Change |
|---|---|
| `src/components/collection/QuickViewModal.tsx` | Part 1 layout fixes; Part 2 wire `useFitToLines` for the title |
| `src/hooks/use-fit-to-lines.ts` | New. Pretext-backed binary search hook |
| `package.json` | Add `@chenglou/pretext` dependency |

No DB changes. No route changes. No other components affected.

---

## Order of operations
1. Install `@chenglou/pretext` via `bun add`.
2. Ship Part 1 layout fixes.
3. Open modal at all 5 viewports, screenshot, verify title doesn't clip and image doesn't collide.
4. Ship Part 2 hook + wire it.
5. Re-screenshot at all 5 viewports with 3 different title lengths to verify fit-to-lines is working (short title = big, long title = smaller but same line count).

QA exit criteria: across every breakpoint × every product, title fits in ≤ 2 lines, never clips, never overlaps the close button, and image never collides with title baseline.