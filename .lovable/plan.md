# QuickView UX fixes

All three fixes live in one file: `src/components/collection/QuickViewModal.tsx`.

---

## 1. Thumbnail strip — make overflow obvious

**Owner's words:** "How do you scroll to see images that 'bleed' off the page?"

**Now:** thumbs row has hidden scrollbars + prev/next chips that only appear on desktop hover. On touch / first glance there's no signal more thumbs exist.

**Fix:**
- Add a soft fade gradient on the right (and left when scrolled) edge of the thumb strip so clipped thumbs visibly fade rather than hard-cut.
- Show the prev/next chevron chips whenever overflow exists (not gated on hover). Keep them subtle — charcoal/40, no background.
- Show the existing `n / total` counter unconditionally when `images.length > 1` (today it's tucked in only on certain states).
- Mobile: leave the swipe gesture alone; the fade edge is the affordance.

No layout change, no new components.

---

## 2. "Show Scale" should follow the active image

**Owner's words:** "Show Scale for Tableware does not change with images."

**Now:** lines 93-95 explicitly turn it OFF every time `imgIdx` changes:
```ts
useEffect(() => { setShowScale(false); }, [imgIdx]);
```
That was added because the rule was hard-coded to product-level dims. But `activeDimensions` (line 85) already resolves per-variant from `matchVariant(activeImg)`. The reset is no longer needed.

**Fix:**
- Delete the reset effect.
- The `dims` memo (line 86-89) already keys off `activeDimensions`, so the rule re-renders against the new image's width/height automatically.
- Edge case: if the new image has no matched dims (`hasScale === false`), hide the rule for that image only and keep `showScale=true` so it returns when you page back. Button label switches to disabled state ("No scale") rather than toggling off.

---

## 3. Per-image variant label

**Owner's words:** "For Vintage Silver Goblets… how would a client know which is which if the name does not change when the image does?"

**Now:** when `activeVariant.title !== product.title`, line 416-418 shows the variant name as a small caption in the right info column. On mobile that column is below the fold — owner can't see what they're looking at.

**Fix:**
- Add a small badge **on the stage**, bottom-left of the image, when `activeVariant` exists and differs from product title. Style: charcoal/70 backdrop-blur, white uppercase 10px tracked text, e.g. `7"  ·  GOBLET`.
- Keep the existing right-column caption — they reinforce each other on desktop.
- Also add the variant title to each thumbnail's `title` attribute and `aria-label` (already partially there via `altText`) so hover tooltips on desktop confirm what each thumb is.

Family token / numeric matcher already in place (lines 60-80) — this is purely surfacing what the modal already knows.

---

## Out of scope

- Variant clicking from the variant row (line 432-447) already jumps to that image — no change.
- Lightbox, swipe gestures, footer CTA — untouched.
- No DB / catalog changes.

## Files touched

- `src/components/collection/QuickViewModal.tsx` — only file.
