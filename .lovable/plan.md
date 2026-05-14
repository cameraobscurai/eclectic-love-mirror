## Read

Nima = 1 photo, 4 stocking configs. The data is right. The modal layout makes it look broken because rows look clickable (they aren't — no per-variant images), and the heading "Stocked Quantity" undersells what's actually a config table.

## Fix (UX, not copy)

`src/components/collection/QuickViewModal.tsx`, variant block (~L365–401):

1. **Drop the button shell when no variant has its own image.** Render rows as plain `<div>`s — no hover, no cursor, no fake affordance.
2. **When variants DO have their own images**, keep click-to-switch but add a small thumbnail dot/strip beside the row so the affordance is visible, not implied.
3. **Section heading** adapts: "Configurations" when variants carry config labels, "Sizes" when they're size-only, "Stocked Quantity" only when rows are pure qty.
4. **Row rhythm**: qty pill on the left, label, dims on its own line beneath in muted — so long dim strings stop colliding with the label.

Owner's config text is untouched.

## Scope

One file. No data, no schema, no new components.
