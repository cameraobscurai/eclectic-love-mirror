```

```

```
Correction before implementation:

Do not introduce `#fafaf7`.
No new stage color.
No new color token.
No local color constant.

I want Quick View to stay white and glassmorphic, not become a new warm off-white surface.

Use the existing palette only:
- white
- cream where already used
- charcoal
- existing divider opacity values
- existing glass treatment

Revised QuickView direction:

1. Stage surface

Use white as the product stage.

Preferred:
- main product stage: `bg-white`
- modal/shell can retain existing cream only if already part of the page system
- do not add a new off-white

The product stage should feel like a clean exhibition surface, not a beige panel.

2. Glassmorphic layer

Use glass for the overlay/scrim and any floating label/meta surfaces, not as a new page color.

Approved glass grammar:
- backdrop blur
- translucent white/cream
- subtle border
- soft shadow
- no rounded-full pills
- no colored tint

Example direction:

Scrim:
`bg-charcoal/35 backdrop-blur-md`

Glass plate:
`bg-white/55 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_-16px_rgba(26,26,26,0.18)]`

Add Safari support where needed:
`style={{ WebkitBackdropFilter: "blur(20px)" }}`

3. Product name composition

Keep the good parts of the plan:
- reduce title scale
- anchor product name bottom-left
- image sits above the type
- name acts like backdrop typography, not a competing headline
- no huge title overpowering the object

But do not use the new off-white stage.

4. Remove duplicate spec/tagline line

Approved:
- remove the top-right run-on tagline/spec block
- footer remains the single source for dimensions and stocked quantity

5. Footer

Footer should stay white/glass/cream within existing palette.

Do not create a new background color.

Options:
- `bg-white`
- `bg-white/80 backdrop-blur-md`
- existing cream only if already used consistently

Keep:
- thin divider
- DIMENSIONS
- STOCKED
- ADD TO INQUIRY

6. Scope

This is still QuickViewModal-only unless glass token already exists.

Do not:
- add new colors
- add new tokens
- redesign Collection
- add cards/pills
- add ecommerce language
- change data
- change IA

Correct outcome:
Quick View feels brighter, cleaner, white, glassmorphic, and object-focused using the current palette only.
```

Short version:

```

```

```
Do not add `#fafaf7`. Keep Quick View white and glassmorphic using the existing palette. The stage should be `bg-white`; glass belongs to the scrim/floating surfaces via `bg-white/55 backdrop-blur-xl border-white/40`, not a new warm color.
```