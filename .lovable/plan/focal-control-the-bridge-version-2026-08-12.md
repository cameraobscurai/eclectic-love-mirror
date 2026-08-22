# Focal control — the bridge version

Two competitor reviews (Squarespace media, Wix/Shopify platform) came back with the same verdict, and they corrected me on two facts.

**Correction 1:** `FocalEditor` _is_ mounted — `ImageOrderEditor.tsx:420`. My earlier read was wrong.
**Correction 2:** my previous plan ignored `docs/cover-system-spec.md` and `docs/frame-studio-plan.md`, which declare a freeze on `NormalizedProductImage` / `categoryFit` / focal, and schedule focal's deletion in Phase 5. Building a polished focal management suite on top of it is investing in a condemned mechanism.

So: build the bridge, not the cathedral. Scope is small on purpose.

## The real bug found in review

`ImageOrderEditor.tsx:423-424` passes `initialX={null} initialY={null}` hardcoded, even though the parent already has the row. `FocalEditor` papers over it with a client-side Supabase re-fetch on mount. Any badge driven off that field paints `AUTO` first and corrects later — a UI that lies about override state, which is the Ingram bug's sibling.

## The dangerous gap

Once a row has `cover_framed_url`, the tile renders the baked derivative directly — no fit rule, no focal. Focal edits on those rows save successfully and change nothing on the live site. That is a "the site didn't change" support ticket, the exact failure class R8 and the round-trip receipts exist to prevent.

## What to build (four items)

### 1. Pass the real focal values through

Wire `initialX`/`initialY` from the row in `ImageOrderEditor`. Drop the compensating `useEffect` re-fetch in `FocalEditor`.

### 2. Three-state badge on the cover

- `AUTO` (grey) — no override, solver centering
- `MANUAL 49% · 49%` (amber) — override active, with reset on the badge itself
- `FRAMED` (blue) — row has `cover_framed_url`; **focal editor is disabled**, with a line pointing to Frame Studio

State 3 is the whole point. No silent no-op saves.

### 3. Guard on frame-space delta, not photo-space distance

The proposed "within 3% of center" block was wrong — it measured the wrong coordinate space. Ingram failed because of letterbox overshoot in _frame_ space (`renderedH ≈ 0.48`), not because the click was near photo center.

Run the click through `focalToFrame` — the same function the render path uses — and warn (do not block) when the resulting frame-space delta is under ~1% of frame height/width: "this override does effectively nothing; leave it on auto."

### 4. Surface the audit line

`setCoverFocal` already writes before/after to `admin_audit_log`. Show "set by … on Aug 12" in the panel.

## Cut from the previous plan

- **Catalog-wide overrides panel** — neither Shopify nor Wix ships one; at 894 SKUs with N=0 it is a dashboard for a metric with a scheduled end date. A `focal: manual` filter on the existing `/admin/photos` grid covers it.
- **Preview-before-commit save/cancel flow** — both platforms commit on release with instant undo. Reset-to-auto already is the undo. Adding a save gate teaches modal state to a non-technical user for a control we want used rarely.
- **Any expansion of focal as a durable primitive** — it is a bridge with a shelf life measured in Frame Studio phases.

## Compatibility contract to write down now

- Focal applies **only** where `cover_framed_url IS NULL`. Render-time and bake-time compositing never both own the same pixel placement.
- Focal writes ride the existing `images_version` / `updated_at` cache-buster. No second versioning scheme.
- At Frame Studio Phase 3+, focal becomes an **input to the bake recipe** — hashed into `canonicalizedPlacement`, verifier-gated — not a runtime prop. The manual bbox drag in the Studio editor is its successor.

## Technical notes

- `ImageOrderEditor.tsx:420-427` — pass through `item.cover_focal_x/y` and `item.cover_framed_url`.
- `photos-admin.functions.ts` already returns `cover_focal_x/y` and `cover_framed_url` in the snapshot select — no new server fn, no migration.
- Warn threshold computed with `focalToFrame` from `NormalizedProductImage` so the guard and the renderer can never disagree.
- Add one test to `tests/focal-point.test.ts` locking that `focalToFrame` composes with the solved scale term — the Ingram bug was a composition bug across two functions and current fixtures only lock one.
