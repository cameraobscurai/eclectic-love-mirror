# Collection Photo Audit — Surgical Dev Plan

Ground rule: **no component, layout, or design-token changes.** Every fix in P0–P2 is a data patch (DB row update + rebake) or a URL correction. UI code stays untouched, so nothing can regress visually except the exact tiles being fixed.

Each phase is independently shippable and reversible. Rebake (`scripts/bake-catalog.mjs`) is the single artifact that must be regenerated at the end of each phase.

---

## Phase 0 — Safety net (must run first)

1. Snapshot `src/data/inventory/current_catalog.json` → `scripts-tmp/pre-audit-catalog.json`.
2. Snapshot the six DB columns we will touch: `id, rms_id, title, slug, primary_image_url, images, editorial_order` → `scripts-tmp/pre-audit-rows.json` (via `supabase--read_query`).
3. Screenshot each of the 14 category grids at 1280×1800 → `scripts-tmp/pre-audit/{slug}.png`. These are the before-images for visual regression.

Rollback for any later phase = restore the JSON slice, restore the row(s), rebake.

---

## Phase 1 — P0 data integrity (10 rows)

Only broken pointers and wrong-color covers. All are single-row DB updates via `supabase--migration`; no schema change.

| Row | Fix | Verification |
|---|---|---|
| Chandelier 2464 (Gideon) | `primary_image_url` → next valid asset in `images[]` | Load `/collection?view=gideon-…` — image renders |
| Tableware 2810 (Dilani) | URL-encode the space in `primary_image_url` | Same |
| Pillow 2358 (Navajo Yellow) | Swap primary to the yellow asset already in `images[]` | Cover matches title |
| Pillow 2644 (Fringe Ivory) | Swap primary to the ivory asset | Cover matches title |
| Table 3032, 3031 (Boulder swap) | Swap `title` between the two rows OR swap `slug` — owner decides which is truth | Both detail pages resolve, sizes match photos |
| Furs 3821 (Isaac ↔ Kaino filename) | Confirm with owner: rename asset or repoint | Detail page shows Isaac product |
| Seating: Adelaide 2970, Thatcher 4052 | Flag-only for now (no swap yet — see Phase 2) | — |
| Lighting: Giesel/Darnell/Maor 107-byte files | Re-mirror originals from source bucket | HEAD returns >10KB |

Deliverable: one migration file `fix_p0_photo_data.sql` + one rebake.
Regression risk: near zero (each edit touches one row, verified by URL).

---

## Phase 2 — P1 cover swaps (11 rows)

Pure `primary_image_url` reassignment. The alt image already exists in `images[]`, so nothing to upload.

Seating: Thatcher 4052→idx1, Talon 945→idx2, Vixxen 2747→idx1
Tables: Bartolo 3107→idx2, Aaron 2861→idx1, Farrow 2764→idx1, Timon 362→idx1
Lighting: Gemma (ON), Darnell (ON)
Chandeliers: Gideon 2464 (if Phase 1 chose a temp asset, revisit)

One migration `apply_p1_cover_swaps.sql`, one rebake. Take an after-screenshot per affected category and diff against the Phase 0 snapshot — only the intended tiles should differ.

---

## Phase 3 — Storage category rescue (11 products)

10 of 11 are 114–300px. Not a code problem — a source-asset problem.

Two-track:
- **Track A (owner):** request original photos from owner for Beatrice, Berkshire, Cardea, Dezik, Kalil, Ovalia, Rosa, Salida, Vespa + one more. Manifest lives at `scripts-tmp/storage-reshoot-request.csv`.
- **Track B (interim):** apply CSS `min-height` to Storage tiles? **No.** That would regress the grid. Instead: temporarily hide the Storage category from the group nav until Track A returns, or leave as-is with a stakeholder note. Owner decision.

No code change in this phase without explicit owner sign-off.

---

## Phase 4 — Editorial order (single JSON patch, no UI change)

`editorial_order` is the source of truth per memory. This phase writes new order values via `/admin/photos` or a scripted `UPDATE`; no component logic changes.

Scope per category (from reports):
- Seating: move Ingram 4180 out of light-run
- Tables: cluster Bartolo/Farrow/Toshia columns; push light wood later
- Styling: break up the Tivoli 5-in-a-row at 62–66
- Rugs: material-block regroup (hides → jute → kilim)
- Serveware: type-block regroup (decanters, tubs, trays)
- Candlelight: pair alabaster votives 3468 + 3776
- Chandeliers: pair crystals (Namiah + Dezmelda), pair leather (Casey + Erizo)
- Large-Decor: cluster firepits (Blaze, Ember, Jacen, Sutton)

Deliverable: `scripts-tmp/editorial-order-proposal.json` — a manifest of `{id, current_order, proposed_order, rationale}` for owner review **before** applying. Never bulk-write order without the manifest (per Core memory).

---

## Phase 5 — Background/cutout standard drift (defer)

Tables dark halos, Bronson solid-BG glassware, Rugs in-situ vs flat-lay. These need re-editing of source assets, not code. Add to a `scripts-tmp/reshoot-queue.csv` for owner. **Do not** attempt masking in code — that path has broken the site before per Core memory.

---

## Guardrails (apply to every phase)

- No edits under `src/components/`, `src/routes/collection.tsx`, `src/lib/collection-*`, `src/lib/image-url.ts`, or `src/styles.css`.
- No changes to `primaryImage` rendering pipeline, `NormalizedProductImage`, or CDN transform helpers.
- Every DB write goes through a migration file so it is reviewable and revertible.
- After each phase: rebake, re-screenshot the affected category grids, diff against Phase 0 snapshots. Only intended tiles may differ.
- If any unintended diff appears, revert the migration and stop.

---

## Technical details

- Migrations use `supabase--migration`; no direct table drops or column changes.
- Rebake command: `node scripts/bake-catalog.mjs`.
- Grid screenshot check: Playwright at 1280×1800, `http://localhost:8080/collection?group={slug}`, top of grid only.
- All manifests land under `scripts-tmp/` (already gitignored per project convention).
- No secret changes, no Cloudflare Worker code changes, no SSR touch.

---

## Suggested execution order

1. Phase 0 (snapshots) — 1 pass.
2. Phase 1 (P0 data) — one migration, one rebake, verify 10 URLs.
3. Phase 2 (P1 covers) — one migration, one rebake, verify affected categories.
4. Phase 4 manifest generation — write the proposal, hand to owner, wait for approval before writing.
5. Phase 3 & 5 — owner-blocked; open the requests, park.

Total code footprint if everything runs: 2 migration files, 0 component edits, 1–2 manifest JSONs. Nothing to regress.
