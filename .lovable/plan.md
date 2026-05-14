## What's broken

Variant rows in the QuickView modal only react when filename heuristics map a variant to a specific image. So:

- **Anastasia, Akoya, Lapis, Lavanya, Thistle** → clicking rows swaps the hero image (works today).
- **Nima Banquette** (and any product with 1 photo / N configs) → rows render as inert `<div>`s. Clicking does nothing. The user sees a list that looks selectable but isn't.
- Even on products that work, the affordance is weak: rows are full-width invisible buttons with no visible swatch or active state beyond a font-weight bump.

## Fix — `src/components/collection/QuickViewModal.tsx` only

### 1. Decouple selection from image index
Add `selectedVariantId` state, default = variant matched by current `imgIdx` (or first variant). The variant rail drives:
- Image swap when a per-variant image exists.
- The on-image badge ("DINNER FORK").
- The variant name under the title.
- The dimensions line in the info rail.

When no image maps to a variant, the family hero stays put — but the **badge, title line, and dimensions still update**. Selection is always meaningful.

### 2. Add a thumbnail swatch on every variant row
Left edge of each row gets a 36×36 image chip:
- If the variant has a matched image → show that image.
- If not → show the family hero (so the row reads "this config, this look").

This is the core best-practice change: a visual chip turns the row into an obviously-clickable swatch + label pair (Aesop / Apple Store config picker pattern). The qty pill moves next to the label.

### 3. Active-state treatment
Selected row gets:
- 2px charcoal left border (or filled chip outline).
- Qty pill flips to charcoal-on-cream.
- Label gains `font-medium`.

Unselected rows: subtle hover bg only. No fake button shells when nothing is interactive — but with the chip, every row IS interactive now.

### 4. Hover preview on desktop
Hovering a variant row briefly previews its matched image in the main stage (250ms crossfade), reverting on mouseleave unless clicked. Disabled on touch + reduced-motion. This is the standard e-com config-picker behavior (Nike, Aesop, SSENSE).

### 5. Tighten the matcher
Small additions to `matchVariant` so more rows wire to real images automatically:
- Fraction-aware numeric match (already present, keep).
- Synonym map: `CHARGER`, `BOWL`, `PLATE`, `LOW BOWL`, `COUPE`, `ROCKS`, `TUMBLER`, `WHITE WINE`, `RED WINE` → recognized as multi-word tokens, not split.
- Tie-breaker: when multiple variants score equally, prefer the one whose dimension number appears in the filename.

### 6. Keep the heading logic
"Configurations" / "Sizes" / "Stocked Quantity" auto-pick (already in place). No copy changes to owner data.

## Out of scope
- No DB or catalog changes. Owner text untouched.
- No new components, no new routes.
- Thumbnails strip below stays as-is for full image browsing.

## Files
- `src/components/collection/QuickViewModal.tsx` — only file edited.
