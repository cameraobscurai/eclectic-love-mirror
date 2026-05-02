# QuickView — diagnose why it looks broken, and fix it

You're right, the screenshot looks bad. Three independent layout bugs are stacking on top of each other. Honest diagnosis from the actual code, then the fix.

---

## What the screenshot actually shows

- **Top half of the stage**: completely empty white.
- **Sofa**: pinned to bottom-right, nearly touching the footer divider.
- **Title "Calista Fringe Sofa"**: clipped on the left ("Calista" visible, "Fringe Sofa" mostly hidden behind the sofa, and the bottom of the glyphs is sliced off by the footer).
- **Footer**: fine.

This is not "editorial composition." It's two elements fighting for the same corner.

---

## Why it's happening (3 stacked bugs in the code)

### Bug 1 — Title and image are both anchored to the bottom, with no shared structure
The title is `absolute bottom-6 left-10 right-10` (fills the bottom band of the stage).
The image lives in a `grid place-items-center` container that fills the same stage.
Image has `z-[2]`, title has no z-index. Image wins. They collide because nothing relates them spatially — they're two free-floating absolutes.

### Bug 2 — `line-clamp-2` is silently clipping the title
`line-clamp-2` forces `overflow: hidden` + `-webkit-box-orient: vertical`. Because the title's absolute container is only ~one display-line tall before the footer divider, the *bottom* of the glyphs (descenders on "g", baselines of "Sofa") gets sliced. That's the "…ofa" effect you see.

### Bug 3 — The stage uses `flex-1`, so it stretches to fill the modal
Modal is `md:max-h-[90vh] flex flex-col`. Stage is `flex-1 min-h-[58vh]`. After the small top bar + footer, `flex-1` blows the stage open to ~75vh. The image is `max-h-[60vh]` centered in it — leaving a giant empty band at the top. That's the dead white zone.

---

## Do I know what the issue is?

Yes. The reference composition (product sitting *on* the type) requires the image and title to share a **defined ground line**, not be two absolutes in a stretchy flex container with one of them silently clipped.

---

## The fix (one file: `src/components/collection/QuickViewModal.tsx`)

### 1. Stage = fixed aspect, no `flex-1`
- Replace `flex-1 min-h-[58vh] md:min-h-0` with `aspect-[16/9] max-h-[68vh]`.
- Stage is a predictable rectangle, no more empty top half.

### 2. Title = flow element at the bottom of the stage
- Remove `absolute … bottom-6` and remove `line-clamp-2`.
- Stage uses `flex flex-col justify-end` so title sits flush to the bottom.
- `whitespace-nowrap overflow-hidden` — long names bleed out the right edge intentionally (that IS the Calista-reference look), short names don't get stranded. No more vertical clipping.

### 3. Image = absolute inside the stage, baseline-shared with the title
- Image container: `absolute inset-0 flex items-end justify-center pb-[14%]` — sofa base sits ~14% up from the stage bottom, on top of the title.
- Image: `max-h-[78%] max-w-[88%] object-contain`, `z-10`.
- Title: `z-0` (full charcoal, not /90).

### 4. Title scale recalibrated
- `clamp(3rem, 9vw, 9rem)` (bigger than current 7vw — it can be, now that it has a real baseline).
- `leading-[0.85]` so descenders don't crash the footer.

### 5. No padding between title and footer
- Stage gets `pb-0`. Footer's top border becomes the title's baseline.

### Result
- No empty top half (defined aspect, not flex-1).
- No clipped letters (no line-clamp, no collapsed absolute band).
- Image and title share a ground line (Calista composition).
- Long names bleed editorially instead of getting "…" sliced.

---

## Out of scope
- No new colors, tokens, palette changes.
- No layout changes outside QuickViewModal.
- No Collection / IA / data changes.

## Acceptance
- Calista Fringe Sofa: sofa sits on the type, no dead white zone, no clipped letters.
- Short name (Aviana): type doesn't look stranded.
- Long name (Lindt Toffee Velvet Channel): bleeds right edge intentionally.
- Mobile: single-screen, image above type, footer fixed at bottom.
