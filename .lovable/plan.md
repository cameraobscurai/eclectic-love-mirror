## Problem

In QuickView today, the scale annotations float in **stage coordinates**, not in **furniture coordinates**:

- Width rule: pinned to the bottom of the stage at a fixed `52%` width
- Height rule: pinned to the right side of the stage at a fixed top/bottom inset
- Image: lives in its own absolutely-positioned container, also sized to ~52% of stage

The rules and the image are sized identically by coincidence, but they're **two unrelated layout systems**. There's no formal "this is the furniture's zone" — so the rules read as floating chrome, not as architecture wrapping the object.

Plus the title's fit-to-lines logic produces inconsistent results across pieces — short names get blown up to 112px, long names break awkwardly.

## Goal

Define a single **measurement zone** — the rectangle the image lives inside — and attach the scale rules to its edges. Same envelope for every piece (per your direction), but the rules now formally wrap that envelope. Then tighten title sizing so it reads consistently.

## Build

### 1. Introduce a measurement zone in QuickViewModal

Replace the two independent absolutely-positioned containers (image div + width-rule div + height-rule div) with one **zone wrapper** that owns all three:

```text
┌─ stage ────────────────────────────────────────┐
│  TITLE (top-left, behind)                       │
│                                                 │
│        ┌─ measurement zone ─────────┐           │
│        │                            │           │
│        │       [image]              │  height   │
│        │                            │   rule    │
│        │                            │           │
│        └────────────────────────────┘           │
│                  width rule                     │
└────────────────────────────────────────────────┘
```

Concretely, in the stage:

- One absolutely-positioned `.zone` element, sized to the existing image envelope (`max-w-[52%] max-h-[62%]`), bottom-anchored, centered
- Inside the zone: the image (fills it via `object-contain`)
- When `showScale` is on:
  - Width rule rendered as a sibling of the image, positioned `absolute -bottom-6 left-0 right-0`, width = 100% of zone
  - Height rule rendered as a sibling, positioned `absolute -right-6 top-0 bottom-0`, height = 100% of zone

Both rules now physically attach to the image's actual frame. As the image's bounding box is the zone, the rules wrap the furniture region — not the stage.

### 2. Simplify ScaleRule

Drop the `pctOf` ceiling math (`CEILING_W`, `CEILING_H`) — the zone now controls size. The rule components become pure span-the-parent renderers:

- `ScaleRuleWidth` → full-width hairline + serifed end caps + label, fills its parent
- `ScaleRuleHeight` → full-height hairline + serifed end caps + rotated label, fills its parent

Keep the same visual register (charcoal/55, 0.4 stroke, 10px Saol-style label, 0.28em tracking).

### 3. Tighten title fit-to-lines

Current logic targets 2 lines, range 28–112px, max-width = 85% of stage. Issues:

- Short titles ("Lyon Stool") explode to 112px and look comical
- Long titles ("Hadley Velvet Arm Chair") wrap unpredictably

Changes:

- Lower max from 112px → 92px (cap the visual ceiling)
- Cap by character count too: if `title.length < 14`, max = 72px; otherwise 92px
- Keep target = 2 lines, but allow 1 line for short titles (don't force a wrap)
- Tighten max-width from 85% → 78% of stage so the title never reaches under the image

### 4. Show Scale label refinement

Move the toggle from "underline link in the spec row" to a small button beside Dimensions with a hairline frame, so it reads as a tool tied to the dimension, not a footer affordance. Same uppercase tracking, same typography. (Matches your screenshot's framed "SHOW SCALE" pill — keep that idea, just visually quieter.)

## Files

- `src/components/collection/ScaleRule.tsx` — drop ceiling math, rules now span parent
- `src/components/collection/QuickViewModal.tsx` — introduce zone wrapper, attach rules to zone, tighten title fit, refine toggle placement

## Out of scope

- True relative scaling (32" stool visibly smaller than 84" sofa) — explicitly rejected; zone stays constant
- ProductTile changes — this is QuickView-only
- Any data / inventory work
