# QuickView — stage-driven layout (image fits the stage, not the other way around)

## The real diagnosis

Every previous QuickView pass kept treating the **image** as the load-bearing element. That's why every product reshapes the modal: a wide sofa, a tall lamp, a square rug, and a small decor piece all produce different compositions because nothing else is fixed.

The fix is a hard rule: **the stage owns the composition. The image fits inside it. The image never controls the modal layout.**

---

## Architecture

```
QuickViewModal (fixed viewport shell)
├── scrim (charcoal/40 + backdrop-blur)
└── modal panel  ─ h-[100dvh] md:h-auto md:max-h-[90dvh]
    │              md:max-w-[1280px]
    │              grid grid-rows-[auto_minmax(0,1fr)_auto]
    │              bg-white
    ├── top bar     (auto height)   eyebrow + PREV/NEXT/×
    ├── stage       (1fr, min-h-0)  ← FIXED COMPOSITION
    │   ├── title   (absolute, bottom-left, z-0)
    │   └── image   (absolute inset, object-contain, z-10)
    └── footer      (auto height, glass)  thumbs · dims · stocked · CTA
```

The stage is a CSS Grid track with `minmax(0, 1fr)`. That gives it a deterministic height: whatever's left after the top bar and footer. It does not grow or shrink based on the image. Footer stays put. Title stays put. Image fills the remainder via `object-contain`.

---

## File: `src/components/collection/QuickViewModal.tsx`

### 1. Modal shell — grid, not flex
```
h-[100dvh] md:h-auto md:max-h-[90dvh]
md:max-w-[1280px]
grid grid-rows-[auto_minmax(0,1fr)_auto]
bg-white text-charcoal shadow-2xl overflow-hidden
```
- Replaces current `flex flex-col` + `flex-1 min-h-[58vh]` (the source of the dead-space bug).
- `minmax(0, 1fr)` is the key — it lets the stage row shrink as well as grow, so it never exceeds the available space and never collapses below it.
- `100dvh` on mobile so the modal owns the full viewport; `max-h-[90dvh]` on desktop so it floats with breathing room.

### 2. Stage — owns the composition
```
relative min-h-0 overflow-hidden bg-white
```
- `min-h-0` is required inside a grid `1fr` row so the image can `object-contain` against the row height (without it, intrinsic image height wins).
- All children are `absolute` *inside* the stage. Stage dimensions come from the grid, not from contents.

### 3. Title — flow inside the stage, behind the image
```
absolute left-6 bottom-6 md:left-10 md:bottom-10
right-6 md:right-10
z-0
font-display text-charcoal
leading-[0.85] tracking-[-0.01em]
whitespace-nowrap overflow-hidden
pointer-events-none select-none
fontSize: clamp(2.75rem, 8vw, 8rem)
```
- `whitespace-nowrap overflow-hidden` — long names bleed off the right edge editorially (the Calista-reference look). No `line-clamp-2` (that was the bottom-clipping bug).
- `bottom-6` so descenders don't crash the footer divider.
- Sits at z-0; image always covers it.

### 4. Image — fits the stage, never resizes it
```
wrapper:  absolute inset-0 flex items-center justify-center
          px-8 md:px-14 py-8 md:py-12

image:    max-h-full max-w-full object-contain
          relative z-10
          drop-shadow-[0_30px_40px_rgba(26,26,26,0.12)]
```
- `max-h-full max-w-full object-contain` is the contract: image always fits, never overflows, never sets dimensions.
- The wrapper's padding is what controls the visual breathing room around the product, not the image.
- A wide sofa fills horizontally with vertical breathing room. A tall lamp fills vertically with horizontal breathing room. Square rug centers. Composition stays identical because the **stage** is identical.

### 5. Footer — auto-row, glass, never jumps
```
border-t border-charcoal/12
bg-white/75 backdrop-blur-xl
WebkitBackdropFilter: blur(20px)
px-6 md:px-10 py-5
grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-5 md:gap-10 items-center
```
- Auto-sized grid row → fixed visual position relative to viewport.
- Three columns on desktop: thumbs · specs · CTA. Cleaner than the current 4-col grid with the spacer hack.
- Specs use the existing `SpecCol` (DIMENSIONS · STOCKED). No duplicate spec line above.

### 6. Mobile
- Same architecture; the grid handles it. `100dvh` modal, `1fr` stage, footer pinned at the bottom.
- Title scale floors at `2.75rem` so it stays present without overflowing.
- Footer collapses to `grid-cols-1` — thumbs row, specs row, CTA row. CTA full-width.

---

## What this fixes

| Bug | Before | After |
|---|---|---|
| Dead white top half | `flex-1 min-h-[58vh]` stretched the stage | `grid-rows-[auto_1fr_auto]` defines exact stage height |
| Title vertically clipped ("…ofa") | `line-clamp-2` forced overflow:hidden in a one-line band | No line-clamp; `whitespace-nowrap` overflows horizontally instead |
| Title + image colliding | Two free-floating absolutes with no shared structure | Both inside the same fixed stage; image always z-10 over title |
| Layout reshapes per product | Image dimensions drove the modal | Stage drives the modal; image `object-contain`s inside |
| Footer jumping | Footer inside the flex container | Footer is its own grid row — never moves |

---

## Out of scope
- No new colors, no new tokens (white stage, charcoal type, glass footer with existing palette).
- No layout changes outside `QuickViewModal.tsx`.
- No Collection / IA / data / filter changes.
- No tagline/description line above the product.

## Acceptance
- Open Calista (wide sofa), Aviana (medium sofa), a tall lamp, a square rug, a small decor piece in sequence: **modal frame, stage height, title position, footer position are all identical**. Only the image inside the stage adapts.
- No empty top half.
- No clipped letters.
- Long names (Lindt Toffee Velvet Channel) bleed right edge intentionally; short names (Aviana) don't look stranded.
- Mobile: full-viewport modal, footer reachable, no horizontal overflow.
