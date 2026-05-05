## What's actually wrong

Pulled live numbers from the database to confirm what you're seeing on /collection?group=pillows:

- **835 public products**, **27 still imageless**, but only **676 distinct hero images** — so **47 image files are bound to 179 different products** (~21% of the catalog is sharing a hero with someone else)
- **Pillows is the worst offender**: 161 products, 91 distinct heroes. Single examples:
  - `PILLOWS/Blue Green Lumbar.png` → bound to **13 different blue pillows** (Denim Buckle, Light Stripe, Velvet Burnout, Native, Sabra, Wild Bird…)
  - `PILLOWS/Brown Grey fur.png` → **12 brown pillows**
  - `PILLOWS/Ivory Black Geo.png` → **10 ivory pillows**
  - `PILLOWS/Green Block Print.png` → **9 green pillows**
- **50 pillow files in storage, only 38 actually used** — 12 owner-uploaded files are sitting unbound while wrong files get reused

Root cause: the earlier "final-bind" pass fell back to a first-color-token match when filename and title didn't agree, so anything starting with "Blue" got the first blue file we found. That rule was fine for true variant families (a flatware set sharing one hero is correct: Heston spoon/fork/knife → `HESTON Set.png`) but catastrophically wrong for pillows, where every SKU is unique.

Some shared bindings are **legitimate** and must be preserved:
- Flatware/glassware sets (HESTON Set, ARIAN Set, NISHA Set, CARLISLE Set, ADONIS Set, MIDAS Set, LARIQUE Set, Sage Set, MILLIE Set) — owner intentionally shoots one set photo
- Banquette sizes (NIMA Banquette — single/double/walnut variants)
- Plinth sizes (TIVOLI Mini Plinth)
- Cocktail column heights (Farrow 28/29/31/38/43)

Categories where shared heroes are almost always **wrong**: pillows-throws, rugs, large-decor, styling, lighting, candlelight, chandeliers, seating (non-set), tables (non-size-variant).

## Plan

Three-phase, dry-run gated. No bulk writes without you reviewing the manifest.

### Phase A — Audit (read-only, no DB changes)

New script `scripts-tmp/audit-image-dupes.mjs`:
1. Pull every product where `images[1]` is shared by ≥2 SKUs.
2. Classify each shared group as:
   - **KEEP (variant family)**: filename ends in `Set.png`, contains "Plinth", "Banquette", "Column", or all sharing-titles share a leading 2-token brand prefix (e.g. "Heston Dark Brown", "Farrow N\""). Owner-intent shared hero.
   - **BREAK (false dupe)**: anything else — especially every pillow group, where titles share only a color word.
3. List unused storage files per category (we know there are 12 unused pillow files — those are real images waiting for their real product).
4. Write three manifests:
   - `audit-keep-shared.json` — confirmed legit families
   - `audit-break-shared.json` — products to reset to imageless pending re-bind (~140-150 rows)
   - `audit-orphan-files.json` — storage files no product points to

Output a summary like the current `reconcile-summary.txt`. **No writes.** You review before Phase B.

### Phase B — Reset wrong bindings + strict re-bind (gated by your approval of A)

1. For every product in `audit-break-shared.json`, set `images = []` so the tile shows the blank/placeholder state instead of a wrong photo. Single migration, one transaction.
2. Strict re-binder `scripts-tmp/strict-rebind.mjs` that ONLY accepts a binding when:
   - **Exact filename match** after normalization (Blue Green Lumbar.png → "blue green lumbar" must equal the title's normalized form, OR every distinctive token in the filename appears in the title — no fallbacks on color alone)
   - OR **Squarespace exact title match** (case-insensitive, full title)
   - No "first color token wins" fallback. No variant-family inheritance for pillows/rugs/lighting/decor.
3. Output `strict-rebind-manifest.json` with three buckets: `apply_safe` (high-confidence), `still_imageless` (no honest match exists), `manual_review` (close but not certain). **No writes** — you review.

### Phase C — Apply strict bindings (gated by your approval of B)

1. Apply `strict-rebind-manifest.json` `apply_safe` rows via migration — sets `images[]` to the correct storage URL.
2. Re-bake `src/data/inventory/current_catalog.json` via `scripts/bake-catalog.mjs` so the Collection page reflects truth on next deploy.
3. Print final report:
   - Imageless count before / after
   - Duplicate-hero groups remaining (should be only the legit variant families)
   - List of orphan storage files still not used (these need owner naming help)

## Outcome you'll see

After Phase B alone, the pillows page will instantly look honest: the ~140 mis-bound products show placeholder tiles instead of pretending to be the same blue pillow 13 times. After Phase C, the 12 unused pillow files in storage land on their real products, and the only shared heroes left are the flatware/glass sets (where owner literally shot one photo for the family).

## What I need from you

Just "go" to start Phase A. Each phase ends in a manifest you review before I touch the database. Nothing destructive runs without your sign-off.