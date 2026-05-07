## Two things in one pass

---

## 1. Lagos Swivel Chair — fix the blank tile

**Diagnosis (confirmed against DB + storage):**

- `inventory_items` row for Lagos (`rms_id=4161`) has `images[0] = .../02-LAGOS_1.png` — that file **404s** in the bucket.
- The real files in storage are `01-LAGOS_Swivel_Chair.png` and `02-LAGOS_Swivel_Chair.png` (both return 200, ~485KB each).
- The baked catalog JSON (`current_catalog.json`, the file the Collection page actually reads on first paint) already points at the correct `02-LAGOS_Swivel_Chair.png` URL — **so the JSON is right, the DB is wrong**.
- Why the tile still shows blank: the previous swap edited the JSON, but on the next bake the script will overwrite it with whatever's in the DB row. The DB is the source of truth — JSON is a snapshot.

**Fix:** one-row migration that rewrites Lagos's `images` array in `inventory_items` to the two real filenames (`01-…Swivel_Chair.png` first as hero, `02-…Swivel_Chair.png` second), then re-bake the catalog so JSON and DB agree. No other rows touched.

```sql
UPDATE inventory_items
SET images = ARRAY[
  '.../squarespace-mirror/lounge/lagos-swivel-chair/01-LAGOS_Swivel_Chair.png',
  '.../squarespace-mirror/lounge/lagos-swivel-chair/02-LAGOS_Swivel_Chair.png'
]
WHERE rms_id = '4161';
```

Then `bun scripts/bake-catalog.mjs` to refresh the JSON.

---

## 2. "Wall" view — port the Lab grid to Collection

A second toggle next to the existing density toggle (the two icons in your screenshot). Clicking it swaps the current scroll-paginated `?view=` for a **viewport-locked specimen wall** of the active subcategory.

### Where it lives

- New URL value: `view=wall` (existing param, currently empty).
- Toggle UI sits **immediately right** of the density toggle in the utility bar (collection.tsx ~line 800). Same 40×40 buttons, same border treatment. Two icons: list/grid (current) and wall (4×4 dense). Only visible when a subcategory is active (wall makes no sense on the overview).
- Density toggle hides when `view=wall` (density is meaningless — the wall auto-fits).

### What it renders

A new component `src/components/collection/CollectionWall.tsx` that mirrors `LabGrid` + `LabTile` from the Local Lvrs project, with these adjustments for Hive:

| Lab original | Hive port |
|---|---|
| Black `#000` background, `bg-border/30` grout | `var(--paper)` (#ffffff) background, `bg-charcoal/8` 1px grout — keeps cutout-on-white aesthetic |
| `scale: 3.2` on hover | `scale: 2.6` — Hive products have less padding, 3.2 clips edges |
| `framer-motion` springs (`stiffness: 380 / damping: 32`) | Same — they're tuned right |
| `dim 0.18` on non-hovered | `0.12` — Hive's white-on-white needs a deeper dim to read |
| `pulse` ambient blip | Drop it — too playful for Hive register |
| Mobile loupe | Keep, but ring uses `mix-blend-multiply` not `difference` (white background) |
| Hero shoe entry screen | Skip — Collection already has the heading & rail; wall mounts directly |
| `framer-motion` import | Already in deps, reuse |

### Layout math (the part that makes it work)

The auto-fit `cols × rows` solver from `LabGrid` is copied verbatim. It runs against the available area: viewport height minus nav + heading + utility bar + subcategory rail (computed from existing `--nav-h` and `--collection-heading-h` CSS vars + a new `--utility-bar-h`). The container becomes `position: absolute` inset-0 inside a `position: relative` shell sized to that remaining viewport, exactly like Lab.

For very large subcategories (Tableware = 173, Pillows = 161) we cap at the same 240 ceiling Lab uses; the rest are reachable by switching back to scroll view. We'll surface a small `"Showing 240 / 173"` line in the bottom meta only if trimmed.

### Component structure

```
src/components/collection/
  CollectionWall.tsx       # auto-fit grid, derived from LabGrid
  CollectionWallTile.tsx   # two-layer motion, derived from LabTile
```

Both are self-contained — no edits to ProductTile (scroll view stays untouched).

### Wiring in collection.tsx

```text
{view === "wall" ? (
  <CollectionWall products={visibleProducts} />
) : (
  <ScrollGrid ... />   // existing block
)}
```

The IntersectionObserver pagination, density toggle, and infinite-scroll batches all stay; they just don't run when `view=wall`. Switching modes preserves `group`, `subcategory`, `q`, `sort` — only `view` flips.

### Interaction details to keep from Lab

- `gap-px` hairline grout (re-tuned to charcoal/8 against white)
- `overflow-visible` on tile wrappers so the zoomed image breaks past its cell
- `memo()` with custom equality on the tile — no re-render storms across 200+ tiles
- `willChange: "transform, opacity"` for compositor promotion
- Spring on scale, ease-out cubic on opacity (separated curves)
- Dim-everyone-on-any-hover for the "isolate" feel
- rAF-throttled touch handler for the mobile loupe

### What's intentionally NOT ported

- The "Enter the Wall" hero/CTA splash screen — Collection already has context
- Ambient pulse — too playful
- `mix-blend-difference` ring — wrong for white bg
- `getUniqueModels()` dedupe — Hive items are already unique
- `Lab / 001` and "Wall of Love" copy — replaced with subcategory name + count

### Edge cases handled

- Subcategory with <12 products → solver picks fewer cols, tiles get bigger (still fills viewport)
- Subcategory with >240 → trim notice in bottom meta
- Resize / rotate → ResizeObserver re-runs the solver
- Switch to wall while scrolled → snap to top
- Switch back to scroll → restore previous scroll position (we already track `lastScrollY` in collection.tsx)

---

## Files

**Edits**
- `src/routes/collection.tsx` — add wall toggle button next to density toggle (~line 800), add `view === "wall"` branch in the body (~line 966), hide density when wall is active
- `inventory_items` (Lagos row only) — one-row migration

**New**
- `src/components/collection/CollectionWall.tsx`
- `src/components/collection/CollectionWallTile.tsx`

**Regenerate**
- `src/data/inventory/current_catalog.json` via `bun scripts/bake-catalog.mjs`

No schema changes. No new deps. ~250 lines new code, ~20 lines edited in collection.tsx.

---

## Open question before I build

Should the wall be **per-subcategory only** (e.g. Lounge Seating wall = ~70 chairs), or also available on the **whole-parent view** (Seating wall = all 102)? Lab uses the whole catalog, but Hive's parents go up to 173 items which would force a heavy trim. My recommendation: **subcategory-only** for now — it preserves the "specimen tray" feel without truncating. Easy to widen later. Let me know if you want it on parent-level too.