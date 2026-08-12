# Fix the cover focal point editor

You didn't break it. The focal tool has been mathematically wrong since it shipped — you're the first person to actually use it hard enough to expose it.

## What's actually wrong

The Ingram cover is a **391 × 151** photo — very wide, very small. Three separate bugs compound on a photo shaped like that:

**1. The editor records the wrong coordinates.** It measures your click against the grey editor box (420 × 260), not against the photo inside it. A wide photo only fills the middle ~62% of that box, so the letterbox padding is being counted as part of the picture. Click the middle of the sofa, and it saves a number that doesn't point at the middle of the sofa.

**2. The tile applies those coordinates against the wrong box too** — the tile frame instead of the photo. The Ingram photo fills only 48% of its tile's height, so every unit of correction you dial in lands roughly **twice as far** as intended. Saved value is `y = 0.179`, which shoves the image down 32% of the tile. That is the "sitting soooo low."

**3. Setting a focal point silently turns off the size solver.** The moment a focal point exists, the tile stops normalizing the piece against its neighbours and renders the raw photo at 100%. That's why re-clicking never rescues it — you've disabled the system that was making it fit and are now hand-driving it blind.

## The fix

**Editor** — measure clicks against the photo, not the box. Compute the contain-letterbox from the image's natural dimensions and convert the click into true photo coordinates. The crosshair dot renders in that same space, so the dot lands exactly where you clicked, on the photo.

**Tile** — convert focal coordinates through the same letterbox ratio before translating, so one unit of nudge equals one unit of movement.

**Keep the solver on.** A focal point becomes an *anchor override only* — it says "center on this point," it no longer says "abandon scaling." The measured scale that makes Ingram sit the same size as Indiwin and Brooklyn stays applied. This is the change that makes the tool stop being fragile: worst case a bad click shifts the piece slightly, it can never blow up the size.

**Live tile preview in the drawer.** Next to the focal stage, a real 5:4 tile rendered through the identical production code path, updating as you click. What you see is what ships — no more save-then-go-look-at-the-site.

**Reset the three rows currently using focal** — Ingram, Cinsere Oak Dining Table, Farrow Cedar Cocktail Column — back to auto. They hold coordinates recorded in the broken space, and auto centering is correct for all three today. That re-centers Ingram immediately. You can then re-set focal on the fixed editor if you still want it.

## Separate note, not fixed here

The Ingram cover file is 391 × 151 pixels. That is small enough to look soft at tile size regardless of framing. Worth swapping for a larger source, tracked separately from this fix.

## Technical

- `src/components/admin/FocalEditor.tsx` — derive `contentW/contentH` from `naturalWidth/naturalHeight` against the stage rect; normalize click and dot position into content space; clamp to the content box so clicks in the letterbox don't register.
- `src/components/collection/NormalizedProductImage.tsx` — in the `hasFocal` branch, stop returning `scale(1)`. Run the solver, then replace only the anchor term: `ty = (fitRule.anchorY + visualOffsetY - scaledFocalY) * 100` where the focal point is mapped through the contain ratio and the solved scale. Same for `tx`. Measurement can no longer be skipped when focal is set, so drop the `if (hasFocal) return;` early-out in the measure effect and keep `ready` gated on measurement.
- New `focalToFrame()` helper co-located with the solver, exported so the admin preview and the tile share one implementation.
- Vitest fixtures in `tests/` locking: (a) a 2.59-aspect photo with focal at content-center produces `ty ≈ 0`; (b) focal never alters solved scale; (c) a square photo maps focal 1:1 (ratio = 1, no regression to normal covers).
- SQL: `update inventory_items set cover_focal_x = null, cover_focal_y = null where cover_focal_x is not null` — 3 rows, then Publish.

## Order

1. Shared `focalToFrame()` + tile math, with tests.
2. Editor click-space fix + live tile preview.
3. Null the 3 stale focal rows, Publish, screenshot the sofas row.

The admin sweep findings from tonight stay parked — Taxonomy Studio guard mismatch and the Supabase Advisor run are still open and unchanged.
