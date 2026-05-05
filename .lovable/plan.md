## Approved. Build this exactly.  
  
Before implementing, replace all placeholder values in the plan with real values, especially:  
  
PARENT_ORDER must be the actual 10-item ordered array:  
lounge-seating  
lounge-tables  
cocktail-bar  
dining  
tableware  
lighting  
textiles  
rugs  
styling  
large-decor  
  
GROUP_TO_PARENT must be fully explicit for all 18 BrowseGroupId values.  
  
Do not leave any "...10 in spec order", "{ ... }", or placeholder mapping in the code.  
  
Final non-negotiable checks:  
  
1. CategoryTonalGrid remains visual only.  
It still emits BrowseGroupId through onSelectCategory(id).  
collection.tsx does the TILE_TO_PARENT_SUB translation.  
  
2. The active product page never renders BROWSE_GROUP_[ORDER.map](http://ORDER.map)(...).  
That array may exist for the landing grid and legacy mapping only, never for the post-click horizontal rail.  
  
3. SubcategoryRail must render from:  
[{ id: "all", label: "All" }, ...PARENT_SUBS[activeParent]]  
  
Do not compute the visible rail from products or counts.  
The rail is taxonomy, not inventory availability.  
  
4. Parent dropdown uses only the 10 parent categories.  
No Sofas, Chairs, Pillows, Serveware, Throws, or Accents in the main dropdown.  
  
5. Selecting a parent from nav always resets:  
subcategory = "all"  
  
6. Selecting a landing tile may set a specific subcategory through TILE_TO_PARENT_SUB.  
  
7. Parent All must show every product in that parent, even if it does not match a subcategory keyword.  
  
8. Do not touch catalog data, images, product cards, quick view, or collection-taxonomy.ts.  
  
After implementation, verify:  
Click Sofas → group=lounge-seating&subcategory=sofas-loveseats  
Rail shows only All / Benches / Chairs / Ottomans / Sofas & Loveseats  
  
Click Tableware from nav → group=tableware&subcategory=all  
Rail shows only All / Dinnerware / Flatware / Glassware / Serveware  
  
Click Rugs from nav → group=rugs&subcategory=all  
Rail shows All / Rugs  
  
The old 18-entry flattened rail must not appear anywhere after click-through.

### Build steps

**1. New module `src/lib/collection-parents.ts**` (pure data, no UI)

```ts
export type ParentId =
  | "lounge-seating" | "lounge-tables" | "cocktail-bar" | "dining"
  | "tableware" | "lighting" | "textiles" | "rugs" | "styling" | "large-decor";

export const PARENT_ORDER: ParentId[] = [...10 in spec order];
export const PARENT_LABELS: Record<ParentId, string> = { ... };

// "all" is implicit (always rendered first). Rugs explicitly keeps "rugs" so
// the rail reads All / Rugs, matching the live site.
export const PARENT_SUBS: Record<ParentId, { id: string; label: string }[]> = {
  "lounge-seating": [
    { id: "benches",          label: "Benches" },
    { id: "chairs",           label: "Chairs" },
    { id: "ottomans",         label: "Ottomans" },
    { id: "sofas-loveseats",  label: "Sofas & Loveseats" },
  ],
  "lounge-tables": [
    { id: "coffee-tables", label: "Coffee Tables" },
    { id: "consoles",      label: "Consoles" },
    { id: "side-tables",   label: "Side Tables" },
  ],
  "cocktail-bar": [
    { id: "bars",             label: "Bars" },
    { id: "cocktail-tables",  label: "Cocktail Tables" },
    { id: "community-tables", label: "Community Tables" },
    { id: "stools",           label: "Stools" },
    { id: "storage",          label: "Storage" },
  ],
  "dining": [
    { id: "consoles",      label: "Consoles" },
    { id: "dining-chairs", label: "Dining Chairs" },
    { id: "dining-tables", label: "Dining Tables" },
  ],
  "tableware": [
    { id: "dinnerware", label: "Dinnerware" },
    { id: "flatware",   label: "Flatware" },
    { id: "glassware",  label: "Glassware" },
    { id: "serveware",  label: "Serveware" },
  ],
  "lighting": [
    { id: "candlelight", label: "Candlelight" },
    { id: "chandeliers", label: "Chandeliers" },
    { id: "lamps",       label: "Lamps" },
    { id: "specialty",   label: "Specialty" },
  ],
  "textiles":    [{ id: "pillows", label: "Pillows" }, { id: "throws", label: "Throws" }],
  "rugs":        [{ id: "rugs", label: "Rugs" }],
  "styling":     [
    { id: "accents",        label: "Accents" },
    { id: "crates-baskets", label: "Crates & Baskets" },
    { id: "games",          label: "Games" },
  ],
  "large-decor": [
    { id: "structures", label: "Structures" },
    { id: "walls",      label: "Walls" },
    { id: "other",      label: "Other" },
  ],
};

// Pure lookup — every BrowseGroupId maps to exactly one ParentId.
export const GROUP_TO_PARENT: Record<BrowseGroupId, ParentId> = { ... };

export const productParent = (p) => GROUP_TO_PARENT[getProductBrowseGroup(p)];

// Tile id → { parent, subcategory } mapping per your spec. Used by collection.tsx
// when CategoryTonalGrid emits a BrowseGroupId.
export const TILE_TO_PARENT_SUB: Record<BrowseGroupId, { parent: ParentId; sub: string }> = {
  sofas:               { parent: "lounge-seating", sub: "sofas-loveseats" },
  chairs:              { parent: "lounge-seating", sub: "chairs" },
  "benches-ottomans":  { parent: "lounge-seating", sub: "all" },
  "coffee-tables":     { parent: "lounge-tables",  sub: "coffee-tables" },
  "side-tables":       { parent: "lounge-tables",  sub: "side-tables" },
  "cocktail-tables":   { parent: "cocktail-bar",   sub: "cocktail-tables" },
  dining:              { parent: "dining",         sub: "all" },
  bar:                 { parent: "cocktail-bar",   sub: "bars" },
  storage:             { parent: "cocktail-bar",   sub: "storage" },
  lighting:            { parent: "lighting",       sub: "all" },
  rugs:                { parent: "rugs",           sub: "all" },
  pillows:             { parent: "textiles",       sub: "pillows" },
  throws:              { parent: "textiles",       sub: "throws" },
  tableware:           { parent: "tableware",      sub: "all" },
  serveware:           { parent: "tableware",      sub: "serveware" },
  styling:             { parent: "styling",        sub: "all" },
  accents:             { parent: "styling",        sub: "accents" },
  "large-decor":       { parent: "large-decor",    sub: "all" },
};

export function productMatchesSub(p, parent, sub) {
  if (sub === "all") return true;
  // Use existing collection-subcategories.ts derivation, extended with the
  // new buckets. Pure title-keyword match, no product mutation.
  return getProductSubId(p, parent) === sub;
}
```

**2. Extend `collection-subcategories.ts**` — additive only

Add rule tables for `dining`, `tableware`, `textiles`, `styling` parents and any missing rules in existing parent tables. Every rule is keyword-based on `title`, first-match-wins. No removals, no product mutation. Items that don't match any keyword still appear in the parent's "All" view (filtering pipeline guarantees this).

**3. Search params** (`src/routes/collection.tsx`)

```ts
group:       fallback(z.string(), "").default(""),    // semantics: ParentId | ""
subcategory: fallback(z.string(), "all").default("all"),
```

Local variables renamed: `activeGroup` → `activeParent`, new `activeSubcategory`. Old `?group=<BrowseGroupId>` URLs trapped at mount, mapped through `TILE_TO_PARENT_SUB` (or `GROUP_TO_PARENT` fallback), and the URL replaced. Bookmarks survive.

**4. Filter pipeline** — strict order

```ts
searchFiltered
  .filter(p => !activeParent || productParent(p) === activeParent)
  .filter(p => !activeParent || productMatchesSub(p, activeParent, activeSubcategory))
```

"All" is the no-op for sub. No item ever disappears from parent All due to keyword miss.

**5. UI swaps**

- `**CategoryTonalGrid**` — visual unchanged. `onSelectCategory(id)` callback unchanged. The handler in `collection.tsx` translates `id` via `TILE_TO_PARENT_SUB[id]` and pushes `{ group, subcategory }`.
- **Active product-page rail** — new component `<SubcategoryRail parent={activeParent} active={activeSubcategory} onSelect={...} />`. Renders `[{ id: "all", label: "All" }, ...PARENT_SUBS[activeParent]]`. Quiet horizontal ALL CAPS, no thumbnails. Selecting a sub only updates `subcategory`, never `group`.
- `**CollectionRail**` (the 18-row thumbnail rail) — removed from the active product-page state entirely. File preserved for reference / potential mobile fallback, but no `BROWSE_GROUP_ORDER.map(...)` runs in any post-click rail. It may still appear on the landing overview if it's already part of that surface today; not added anywhere new.
- **Parent dropdown in `navigation.tsx**` — HIVE SIGNATURE COLLECTION shows exactly the 10 `PARENT_LABELS` in `PARENT_ORDER`, each linking with `{ to: "/collection", search: { group: <ParentId>, subcategory: "all" } }`. Selecting a parent always resets `subcategory` to `"all"`. No tile-level entries (no Sofas, no Pillows) in the dropdown.
- **Floating search modal** — category suggestions switched from 18 BrowseGroupIds to the 10 parents. `commitCategory(parentId)` writes `{ group: parentId, subcategory: "all" }`. Free-text search behavior unchanged.

**6. Routes** — stay on `/collection` (search params only). No new route files. og:image / head meta untouched.

### Acceptance test (matches yours)

- `/collection` → H plate + tiles.
- Click Sofas tile → `?group=lounge-seating&subcategory=sofas-loveseats`. Rail: All / Benches / Chairs / Ottomans / Sofas & Loveseats.
- Nav → Tableware → `?group=tableware&subcategory=all`. Rail: All / Dinnerware / Flatware / Glassware / Serveware.
- Nav → Rugs → `?group=rugs&subcategory=all`. Rail: All / Rugs.
- Nowhere on a clicked-in page does the 18-entry flattened rail appear. `BROWSE_GROUP_ORDER.map(...)` is removed from every post-click rail surface.