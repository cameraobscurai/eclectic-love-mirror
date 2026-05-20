# Gallery Spec — Locked

## Global rules
- Title format: **LOCATION, ST** (display) / **EVENT PLANNER** (eyebrow)
- Cover arc: **dark/moody → pastels** across slots 1→15
- Exclude planner: **VanderWeide**
- NDA (never publish): **Thomas**

## 15-slot order

| # | Location | Planner | Storage folder | State | Cover directive |
|---|---|---|---|---|---|
| 01 | AMANGIRI, AZ | EASTON EVENTS | `AMANGIRI` | live (29) | Chinle dinner / lounge from amphitheater / landscape / Fireside all 5. Skip pool deck. Tone 1 (darkest). |
| 02 | PRIVATE RESIDENCE ASPEN, CO | ASPEN EVENT WORKS | `ASPEN-EVENT-WORKS-ASPEN-PRIVATE-RANCH` | live (44) | Tent 2. Day → personal interleaved → end at night. |
| 03 | BRUSH CREEK RANCH, WY | DIWAN BY DESIGN | `BRUSH-CREEK-DIWAN` (subfolders: `Sapna + Ari`, `Sangeet`) | empty stub | Start with wedding. Sangeet = 0s. |
| 04 | TELLURIDE, CO | LYNDEN LANE | `LYNDEN-LANE` | live (22) | Cover = **1143**. Exclude **1083**. |
| 05 | ANGUILLA, CARIBBEAN | MICHELLE RAGO DESTINATIONS | `ANGUILLA-MICHELLE-RAGO` | empty stub | Wedding day lounge by the sea. |
| 06 | BIG SKY, MT | EASTON EVENTS | `EASTON-EVENTS-MONTANA` | live (32) | Feature Montana folder. |
| 07 | DUNTON HOT SPRINGS, CO | BROOKE KEEGAN EVENTS | `JL-BROOKE-KEGAN-DUNTON-HOT-SPRINGS` | live (73) | Feature 06.15 all pics. Cover = **MKSADLER-4118**. |
| 08 | BRUSH CREEK RANCH, WY | LOVE THIS DAY | `BRUSH-CREEK-LOVE-THIS-DAY` | empty stub | LTD favorites open, arrange on color (Westworld). Carrie King: Americana + N+B wedding (3). Ralph: red/white/denim. Erich add-ons: Westworld. |
| 09 | BISHOP'S LODGE, NM | 42 NORTH | `BISHOPS-LODGE-42-NORTH` | empty stub | Cocktail hour → ceremony → tent (10) → Friday details (5). |
| 10 | THE ENCORE, MA | DIWAN BY DESIGN | `ENCORE-BOSTON-DIWAN` | empty stub | Boston celebration. Separate event from #03. |
| 11 | PRIVATE RESIDENCE, TX | CINERGY WORKS | `PRIVATE-RESIDENCE-TX-CINERGY` | empty stub | — |
| 12 | BLACKBERRY FARMS, TN | EASTON EVENTS | `BLACKBERRY-FARMS-EASTON` (Drive: "December Blackberry Farms") | empty stub | — |
| 13 | FOUR SEASONS VAIL, CO | CASSIE LAMERE EVENTS | `FOUR-SEASONS-VAIL-CASSIE-LAMERE` | empty stub | Feature Cassie. |
| 14 | DUNTON HOT SPRINGS, CO | EASTON EVENTS | `dosmasenlamesalittrell` | live (21) | Dos Mas en la Mesa. |
| 15 | HOTEL JEROME, CO | BIRCH DESIGN STUDIO | `BIRCH-DESIGN` | live (13) | Was already on site — moved to end. Tone 15 (pastels). |

## Corrections from prior state
- Slot 03 Brush Creek Diwan = `Sapna + Ari` / `Sangeet` (not Hotel Jerome)
- Slot 10 The Encore = **Boston, MA** (notes typo "MS"); planner = Diwan by Design; own folder
- Slot 15 Hotel Jerome = `BIRCH-DESIGN`, already populated — flip `pending: false`

## Code changes (single edit pass to `src/content/gallery-projects.ts`)
1. Re-point slot 15 Hotel Jerome to real `BIRCH-DESIGN` manifest; remove `pending`.
2. Confirm slot 03 Brush Creek Diwan storage path = `BRUSH-CREEK-DIWAN` (stays `pending` until images land).
3. Confirm slot 10 The Encore storage path = `ENCORE-BOSTON-DIWAN` (stays `pending`).
4. Add manifest stubs for the 7 remaining empty folders (03, 05, 08, 09, 10, 11, 12, 13) so they auto-light when uploads land — no further code change required per gallery.
5. Verify `GALLERY_EXCLUDE_PLANNERS = ["VanderWeide"]` and `GALLERY_NDA_PLANNERS = ["Thomas"]` exported and honored by `<GalleryIndex>`.
6. Verify Telluride hero = 1143 and 1083 excluded; Dunton Brooke Keegan hero = MKSADLER-4118.

## Out of scope this pass
- Mirroring Drive subfolders into the 8 empty buckets (separate upload task)
- Bake script that consumes `coverDirective` automatically — covers stay hand-picked until script lands
