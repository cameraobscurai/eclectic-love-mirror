
# Two surgical additions

Both ideas are *quiet by default* — they only ask for attention when you need them. Neither adds chrome to pages that don't need it. Neither costs performance. Neither competes with the existing typography.

---

## 1A — The Index Strip (Collection page)

A thin vertical rail pinned to the **right edge** of the Collection viewport. It lists every browse group as a short label, set in the existing `text-[10px] uppercase tracking-[0.28em]` register. Click a label, page snaps to that group.

### What it looks like

```text
                                        │
                                        │ SOFAS
                                        │ CHAIRS
                                        │ BO
                                        │ COFFEE
                                        │ SIDE
                                        │ COCKTAIL
                                        │ DINING
   ╭───────────────────────╮            │ BAR
   │   archive grid here   │            │ STORAGE
   ╰───────────────────────╯            │ LIGHTING
                                        │ RUGS
                                        │ PILLOWS
                                        │ THROWS
                                        │ TABLEWARE
                                        │ SERVEWARE
                                        │ STYLING
                                        │ ACCENTS
                                        │ DECOR
                                        │
```

- One vertical hairline (`border-l border-charcoal/15`) is the only chrome. The labels float beside it, no buttons, no background.
- Hover: label slides 4px left, hairline tick beside it darkens. That's it.
- Active group (whichever one fills most of the viewport): label is full-charcoal weight, others sit at `text-charcoal/45`.
- Click: smooth-scroll to that group's heading.

### Honest caveats already addressed

- **Initial-letter collisions** (Sofas/Side/Storage/Serveware/Styling all S; Coffee/Cocktail/Chairs all C) make a single-letter strip useless. Solution: **short word labels**, not initials. Most fit in 6–9 characters; "Benches & Ottomans" becomes "BO", "Large Decor" becomes "DECOR". Saves space, stays readable.
- **Mobile**: the rail is hidden under `md:`. Mobile already has horizontal category scroll at the top; adding a side rail would crowd a small screen. Desktop-only is the honest answer.
- **Doesn't replace** the existing top-row category nav. The strip is an *orientation* device while you scroll, not a primary nav. Both can coexist because the strip is so quiet (no buttons, no background).

### Why this earns its place

876 pieces is too many to scroll without losing your bearings. The strip means you can always see "where am I in the archive" and "what else is here" without ever opening a menu.

---

## 5C — The Scale Rule (QuickView modal)

A small, museum-style measurement rule beside the product image. **Not a human silhouette** — just a labeled architectural rule, drawn in charcoal hairline, showing the actual width of the piece.

### What it looks like

```text
            ┌──────────────────────────┐
            │                          │
            │      [ product image ]   │
            │                          │
            │                          │
            │  ├─────── 32" ───────┤   │
            │  ╵                   ╵   │
            └──────────────────────────┘
                 (rule sits below image,
                  at the actual proportional
                  width relative to the frame)
```

- A horizontal hairline rule with serifs at each end, labeled with the piece's width in inches (the most useful single number).
- Toggled by **one quiet button** in the spec footer: `SHOW SCALE` → `HIDE SCALE`. Lives in the same `text-[10px] uppercase tracking-[0.28em]` register as everything else in the modal — invisible to people who don't need it.
- The rule is drawn at the *actual proportional width* of the piece relative to the visible image frame. So a 32" side table renders a short rule; an 84" sofa renders a long one. The user *sees* width, not just reads a number.
- **No human, no AR, no toggling between heights, no second product comparison.** Single number, single rule. Architectural register, not retail register.

### Data path

- We already have `dimensions` text like `32"W x 14"D x 6"H` on **369 of 876** products.
- A small parser extracts the W (width) value. If width can't be parsed → button doesn't render. Silent fallback, no broken state.
- The other 507 products simply don't get the toggle. No "scale unavailable" labels. Absence is the message.

### Why this earns its place

Furniture's #1 online problem: you can't tell how big it is. Most sites solve this with bloated 3D viewers or AR features that fail on 30% of devices. A literal ruler is the most honest answer in the world, fits the Aesence/Casa Carta editorial register, and costs nothing.

---

## Technical details

**Index Strip**

- New component: `src/components/collection/CollectionIndexStrip.tsx`
- Props: `groups: { id, label, count }[]`, `activeGroupId`, `onJump(id)`
- Reads `BROWSE_GROUP_ORDER` + `BROWSE_GROUP_LABELS` from `collection-browse-groups.ts`
- Adds short-label override map (e.g. `benches-ottomans → "BO"`, `large-decor → "DECOR"`) to keep the rail narrow.
- Uses `IntersectionObserver` on the existing group section headers to track active group; throttled with `requestAnimationFrame`.
- Fixed positioning on `md:` and up; right edge with ~32px margin from viewport. Hidden on mobile.
- Click → `scrollIntoView({ behavior: 'smooth', block: 'start' })` on the matching section.
- Updated route: `src/routes/collection.tsx` mounts the strip, passes group anchors.

**Scale Rule**

- New util: `src/lib/parse-dimensions.ts` — pure function `parseWidthInches(dim: string | null): number | null`. Regex match for `(\d+(?:\.\d+)?)"?\s*W` (case-insensitive). Returns `null` on no match.
- New component: `src/components/collection/ScaleRule.tsx` — pure SVG, hairline stroke, serifed end caps, label centered above. No animation needed; if `prefers-reduced-motion` fine, the toggle still uses a 150ms opacity fade for grace.
- Updated component: `src/components/collection/QuickViewModal.tsx`
  - New state: `const [showScale, setShowScale] = useState(false)`
  - New computed: `const widthInches = parseWidthInches(product.dimensions)`
  - Spec footer renders the toggle button only when `widthInches !== null`
  - `<ScaleRule>` mounts inside the image stage when `showScale && widthInches`
  - Rule is positioned absolutely at the bottom of the image frame, scaled so its rendered width matches `widthInches / 84` × the available image width (84" as the assumed visual ceiling — a long sofa fills the frame, a small bowl is short).
- No new dependencies. No new data. No DB writes.

**Both ideas are reversible.** Either can be ripped out by deleting one component import. Neither touches the inventory contract, the data layer, or any existing UX.

---

## What does *not* get built

- No human silhouettes (rejected as IKEA-coded)
- No A–Z by product title (rejected — names are inventions, useless for browsing)
- No scale toggle for height/depth (just width — single most useful number)
- No mobile index strip (would crowd a small viewport)
- No "scale unavailable" labels for the 507 dimension-less products (silence is correct)

