## Cover audit vs notes

| # | Project | Note | Current cover | Action |
|---|---|---|---|---|
| 01 | Amangiri / Easton | (no specific cover; Chinle/landscape/Fireside) | `COVER_amangiri_night_dinner.jpg` | keep |
| 02 | Aspen / Aspen Event Works | **Tent 2** | `Ceremony Favorite.jpg` | **fix → `Tent 2.jpg`** |
| 03 | Brush Creek / Diwan (Sapna+Ari) | **Start with wedding** | `Sangeet…sp-0049.jpg` | **fix → `Wedding__…sp-0130.jpg`** |
| 04 | Telluride / Lynden Lane | **1143** | `nb-25-taylor&brenden-1143.webp` | keep |
| 05 | Anguilla / Michelle Rago | **Wedding Day Lounge by the Sea** | `Sangeet_Dining_Close_Up.jpg` | **fix → `Wedding_Day_Lounge_by_the_Sea.jpg`** |
| 06 | Big Sky / Easton | (none) | `Tent.jpg` | keep |
| 07 | Dunton / Brooke Keegan | **MKSadler 4118** | `MKSADLER-4118-2.jpg` | keep |
| 08 | Brush Creek / Love This Day | Westworld | `Westworld_Lounge_Close_Up.jpg` | keep |
| 09 | Bishop's Lodge / 42 North | Cocktail → Ceremony → Tent → Friday | `Details_-_Tent…2294.jpg` | **fix → cocktail-hour shot** |
| 10 | Encore / Diwan | (none) | first KT-Merry frame | keep |
| 11 | Private Res TX / Cinergy | (none) | first frame | keep |
| 12 | Blackberry / Easton | (none) | first frame | keep |
| 13 | Four Seasons Vail / Cassie | feature | `WelcomeParty113.jpg` | keep |
| 14 | Dunton / Easton (Dos Mas) | (none) | colorado-158 | keep |
| 15 | Hotel Jerome / Birch | move to end | already #15 | keep |

## Edits

1. `src/content/gallery-manifests.ts`
   - `aspenEventWorksGalleryHero` → `Tent 2.jpg`
   - `anguillaMicheleRagoGalleryHero` → `Wedding_Day_Lounge_by_the_Sea.jpg`
   - `brushCreekDiwanGalleryHero` → `Wedding__2021_09_05_sapnaari-sp-0130.jpg`
   - `bishopsLodge42NorthGalleryHero` → strong cocktail-hour shot (`Cocktail_Hour__KGW-2005.jpg`)

2. Reorder `brushCreekDiwanGalleryPaths` so the Wedding frame is first, Sangeet follows.

3. Vanderweide already excluded, Thomas already NDA-flagged — no list change.

## Known limitation flagged for you

Amangiri's set is mostly UUID filenames. Can't pinpoint "Fireside all 5", "Lounge from amphitheater", or "pool deck (skip)" by filename. Cover stays on the night dinner (matches "Chinle dinner"). To honor the skip/feature instructions inside the set, I need either (a) you to tag those files, or (b) a one-shot AI vision pass to label them — say the word and I'll run it.
