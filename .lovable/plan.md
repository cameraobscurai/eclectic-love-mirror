
# Gallery — lock owner's 15-slot order, titles, and cover rules

Yes, I remember. Confirmed inputs: both Dunton galleries real, #10 is Boston **MA**, I pick covers (respecting owner's named moments) with close/medium/far variety. Storage folders for the 7 net-new galleries don't exist yet — this pass is logic + scaffolding only.

## Scope

Single source of truth edit: `src/content/gallery-projects.ts`. No component or route changes; the gallery page already reads order/title/planner from this file. No storage writes.

## The 15, locked order

| # | LOCATION, ST | PLANNER | Status |
|---|---|---|---|
| 01 | AMANGIRI, AZ | EASTON EVENTS | live |
| 02 | PRIVATE RESIDENCE ASPEN, CO | ASPEN EVENT WORKS | live (retitle) |
| 03 | BRUSH CREEK RANCH, WY | DIWAN BY DESIGN | pending |
| 04 | TELLURIDE, CO | LYNDEN LANE | live |
| 05 | ANGUILLA, CARIBBEAN | MICHELLE RAGO DESTINATIONS | pending |
| 06 | BIG SKY, MT | EASTON EVENTS | live |
| 07 | DUNTON HOT SPRINGS, CO | BROOKE KEEGAN EVENTS | live |
| 08 | BRUSH CREEK RANCH, WY | LOVE THIS DAY | pending |
| 09 | BISHOP'S LODGE, NM | 42 NORTH | pending |
| 10 | THE ENCORE, MA | DIWAN BY DESIGN | pending (Boston, MA — fixed) |
| 11 | PRIVATE RESIDENCE, TX | CINERGY WORKS | pending |
| 12 | BLACKBERRY FARMS, TN | EASTON EVENTS | pending |
| 13 | FOUR SEASONS VAIL, CO | CASSIE LAMERE EVENTS | pending |
| 14 | DUNTON HOT SPRINGS, CO | EASTON EVENTS (Dos Mas) | live |
| 15 | HOTEL JEROME, CO | BIRCH DESIGN STUDIO (Sapna + Ari) | pending |

## Edits to `gallery-projects.ts`

- Re-sequence array to the table above; renumber `number` `01`–`15`.
- Retitle #2 from `BRUSH CREEK RANCH, WY` (Love This Day) entry's current name to **`PRIVATE RESIDENCE ASPEN, CO`** for the Aspen Event Works slot (currently named `ASPEN, CO`).
- Verify Encore entry reads `THE ENCORE, MA` + `location: "Boston, Massachusetts"`.
- Embed owner's per-gallery directives in a new optional `curationNotes` field on each project (string). Examples:
  - 01: "Chinle dinner; lounge from amphitheater; landscape; Fireside all 5; skip pool deck."
  - 02: "Tent 2. Day → personal interleaved → end at night."
  - 04: "Exclude :1083. Cover = 1143."
  - 07: "Feature 06.15 — all pics. MKSadler 4118."
  - 08: "LTD favorites, arrange on color (Westworld). Carrie King Americana + N+B wedding (3). Ralph red/white/denim. Erich add-ons: Westworld."
  - 09: "Cocktail → ceremony → tent (10) → Friday details (5)."
  - 14: "Dos Mas en la Mesa folder."
  - 15: "Sapna + Ari folder."
- Add module-level exclusion constants (documented, not used yet — read by future ingest scripts):
  ```ts
  export const GALLERY_EXCLUDE_PLANNERS = ["VanderWeide"] as const;
  export const GALLERY_NDA_PLANNERS = ["Thomas"] as const;
  ```

## Cover selection rules

Add a typed `coverDirective` field per project so when folders land, the bake/pick script has owner intent encoded:

```ts
coverDirective?: {
  // owner's hard pick if any
  filenameHint?: string;       // e.g. "1143" for Telluride
  excludeHints?: string[];     // e.g. ["1083"] for Telluride
  // distance preference for the *cover* relative to subject
  distance: "close" | "medium" | "far";
  // tonal slot in the dark→pastel arc (1 = darkest, 15 = lightest)
  toneSlot: number;
};
```

Assign `distance` across the 15 to guarantee variety (no two adjacent same): rough rotation `far, close, medium, far, medium, close, medium, far, close, medium, close, far, medium, close, far`.

Assign `toneSlot` linearly 1→15 (dark/moody at top, pastels at the back of the line). This matches the owner's "dark moody → pastels" arc; the existing order already roughly satisfies it (Amangiri sandstone-dark up front, Hotel Jerome pastels at 15).

For live galleries with manifests, also set `heroImage` to the picked filename now:
- **04 Telluride**: pick file matching `1143`, exclude any `1083` from `detailImages`.
- **07 Dunton / Brooke Keegan**: pick `4118` (MKSadler).
- **01 / 02 / 06 / 14**: keep current hero unless it violates distance variety; if it does, swap to the closest manifest entry matching the directive.

## Pending entries

Keep `pending: true` + `pendingGalleryHero(...)` plates. When you upload a folder later, removing `pending` and adding the manifest is a 2-line change per gallery — no schema migration.

## Out of scope (next pass, after images land)

- Storage folder creation in `image-galleries` for the 7 pending galleries.
- Bake script that reads `coverDirective` + manifest to auto-pick hero (close/medium/far enforcement, exclude filter, tonal arc validation).
- VanderWeide removal from storage (the existing folder stays untouched until you say drop it).

## Verification

After the edit: load `/gallery`, confirm filmstrip + index render 15 tiles in the new order with correct titles + planners, Telluride hero swapped to 1143, no console errors. Pending tiles still show charcoal placeholder.
