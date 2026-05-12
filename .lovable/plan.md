Rebalance the QuickView modal — image becomes the hero, title shrinks, specs get weight, image is enlargeable.

## Changes (QuickViewModal.tsx only)

**1. Shrink the title**
- Drop the giant overlapping display title. Cap desktop at ~36–40px, mobile at ~28px.
- Move it inline (top-left of stage, normal flow), no behind-image overlap.
- Remove the fit-to-lines billboard logic.

**2. Enlarge the image**
- Stage zone goes from `max-w-[52%] max-h-[62%]` → `max-w-[88%] max-h-[92%]`.
- Drop the `[zoom:0.75]` on the modal shell so the whole panel renders at full size.
- Image becomes clickable → opens a fullscreen lightbox (zoom-in cursor, click/Esc to close, arrow keys page images).

**3. Promote dims + quantity**
- Footer spec labels: 10px → 11px, more contrast (charcoal/70 → charcoal).
- Spec values: 14px → 16–17px, weight up.
- Dimensions and Stocked sit as the visual anchors of the footer row, not afterthoughts.

**4. Layout cleanup**
- Title row above stage gets a thin hairline; stage no longer needs absolute-positioned title.
- Keep top bar (category + prev/next/close) and footer chrome as-is structurally.

## Out of scope
- No taxonomy, data, or routing changes.
- No new components beyond an inline lightbox overlay inside the same file.

## File touched
- `src/components/collection/QuickViewModal.tsx`
