# Product families — locked plan (2026-08-12)

Replaces bake-time family *inference* with a declared DB model, without changing
today's 636-tile output on day one.

## Why

Membership is currently guessed in `scripts/family-rollup.mjs` by
`familyKeyForRms()` — six heuristic branches (exact live-title match, token
prefix, token subset, first-token + variant-noun, forced overrides, standalone)
run against `scripts/audit/live-inventory-snapshot.json`, a scrape of the
retired Squarespace. The snapshot is frozen; the heuristic can never learn a new
grouping, and Adrienne has no way to create, break, or re-lead a family.

## Model

```
product_families
  id uuid pk
  title text not null           -- the tile name
  slug  text unique not null    -- /collection/<slug>
  lead_rms_id text              -- which member supplies the cover + PDP copy
  created_at / updated_at

inventory_items
  family_id uuid null references product_families(id) on delete set null
  family_position int null      -- order of variants inside the tile
```

Rules:
- Every variant stays a **full inventory row** — own quantity, dimensions,
  photos, taxonomy, audit trail. A family is a display grouping, nothing else.
- Grid shows **one tile per family**; PDP shows a variant switcher.
- Variants are findable in `/admin/products` search individually (they already
  are — search is row-level).
- Variants have no public URL of their own. Nothing today expects one:
  `collection_.$slug.tsx` resolves slugs only against top-level products, and
  the variant object type carries no `slug` field.

## Bake path (dual, so nothing flips at once)

1. `scripts/bake-catalog.mjs` — add `family_id`, `family_position` to the
   `.select()`; fetch `product_families` into a `familiesById` map; pass it to
   `rollupFamilies()`.
2. `scripts/family-rollup.mjs` — in `familyKeyForRms()`, if `p.family_id` is set
   the key is `db:<family_id>` and every heuristic branch is skipped. Rows with
   `family_id = null` keep the existing heuristic. Delete the heuristic only
   after the table covers every family.
3. Family title/slug for `db:` groups come from the `product_families` row; the
   cover still comes from the existing `mergedImages` / `family-cover.ts` logic —
   membership changes, cover selection does not.
4. Preserve the invariant `variants[]` includes the lead row (phase3-catalog's
   `memberIds = [p.id, ...members.map(v => v.id)]` depends on it).
5. A DB family with a single member must still emit `variants: []`, or
   bake-catalog's `isRolled` live-overlay merge path fires wrongly.

Untouched: `src/lib/phase3-catalog.ts`, `QuickViewModal`, `bake-family-map.mjs` —
they consume the baked `variants[]` shape, which is unchanged.

## The ~200 (85 real) inferred families

Convert, then review. One-time backfill writes the current grouping into
`product_families` + `family_id` using `family-map.json` as the source, so
membership is byte-identical the day the DB path turns on. Anything the
heuristic got wrong is then fixable in the admin instead of in a script.

## Admin surface

`FamilyPanel` becomes writable: group rows into a family, set the lead, reorder
variants, break a family apart. Today it is a read-only render of a build-time
JSON with no staleness indicator.

## Vocabulary

Three words are in use for two concepts. Lock:
- **Collection** = declared taxonomy (`collection_slug`). Ten of them.
- **Family** = variant grouping that renders one tile. Rename FamilyPanel's
  "Part of a collection" label and the photos-grid "N variants" badge to
  "Family".
