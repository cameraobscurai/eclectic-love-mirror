
## Gallery restructure — 15 projects, owner-confirmed order

### Title format (site-wide)
- **Primary**: `LOCATION, ST` (e.g. "AMANGIRI, AZ")
- **Eyebrow / subtitle**: planner name (e.g. "EASTON EVENTS")
- Index, hero card, lightbox header all use the same shape.

### Final order + cover shot intent
Dark/moody → pastels. Cover shot distance cycles **far → medium → close** so the filmstrip has rhythm. Each cover respects owner's specific picks where given (Lynden 1143, Cassie feature, Anguilla feature, Montana feature, Amangiri Chinle dinner, etc).

| # | LOCATION, ST | PLANNER | Cover intent | Shot |
|---|---|---|---|---|
| 01 | AMANGIRI, AZ | EASTON EVENTS | Chinle long-table at dusk, sandstone backdrop | far |
| 02 | BRUSH CREEK RANCH, WY | LOVE THIS DAY | Westworld/Americana wide — color-arranged favorites | far |
| 03 | DUNTON HOT SPRINGS, CO | BROOKE KEEGAN EVENTS | MKSadler-4118 candlelit interior (moody pivot) | medium |
| 04 | DUNTON HOT SPRINGS, CO | EASTON EVENTS (*Dos Mas*) | Long meadow table, saturated | medium |
| 05 | BLACKBERRY FARMS, TN | EASTON EVENTS | Wood-paneled dining, lantern light | close |
| 06 | PRIVATE RESIDENCE, TX | CINERGY WORKS | Tablescape detail, deep tones | close |
| 07 | BIG SKY, MT | EASTON EVENTS | Tent at dusk — Montana feature shot | far |
| 08 | BRUSH CREEK RANCH, WY | DIWAN BY DESIGN | Wedding ceremony wide (sangeet excluded) | far |
| 09 | BISHOP'S LODGE, NM | 42 NORTH | Tent interior, Santa Fe earth tones | medium |
| 10 | THE ENCORE, MA | DIWAN BY DESIGN | Ballroom architectural wide | far |
| 11 | FOUR SEASONS VAIL, CO | CASSIE LAMERE EVENTS | Cassie-feature hero | medium |
| 12 | ASPEN, CO (private ranch) | ASPEN EVENT WORKS | Tent 2, day→evening pivot | medium |
| 13 | TELLURIDE, CO | LYNDEN LANE | nb-25-1143 (modernist outdoor lounge) | medium |
| 14 | ANGUILLA, CARIBBEAN | MICHELLE RAGO DESTINATIONS | Wedding-day lounge by sea — Anguilla feature | far |
| 15 | HOTEL JEROME, CO | BIRCH DESIGN STUDIO | Welcome lounge / pastel rehearsal detail | close |

VanderWeide removed. Thomas NDA respected (never referenced). Tonal arc starts at Amangiri's red-sandstone mood and resolves at Jerome's pastels/disco.

### Data layer changes

**`src/content/gallery-projects.ts`**
- Add fields to `GalleryProject`:
  - `planner: string` — required, displayed as eyebrow
  - `pending?: boolean` — true when storage folder isn't uploaded yet
- Repurpose `name` → `LOCATION, ST` string. Brand goes to `planner`.
- Replace `galleryProjects` array with the 15 entries above in order.

**`src/content/gallery-manifests.ts`**
- Keep the 6 real manifests: Amangiri, Aspen, Birch, Easton-Montana, Brooke-Keegan-Dunton, Lynden Lane.
- Drop the VanderWeide and Dos Mas Lamesa exports (not used in new order; Dos Mas folder name doesn't match owner's Dunton/Dos Mas pairing — owner re-confirmed Dunton×2, so I'll wire Easton-Dunton as a pending slot).
- Add **pending manifest stubs** for the 9 not-yet-uploaded folders. Each stub exports:
  ```ts
  export const brushCreekLoveThisDayPending = {
    folder: "BRUSH-CREEK-LOVE-THIS-DAY",   // canonical slug
    hero: { src: PLACEHOLDER_HERO, alt: "..." },
    images: [],
  };
  ```
- `PLACEHOLDER_HERO` = a single neutral charcoal SVG data URI bundled in the file (no broken image). Lightbox will read `pending` and show "Imagery loading — folder being prepared" instead of an empty filmstrip.

### Presentation layer changes

**`src/components/gallery/GalleryIndex.tsx`**
- Add planner row beneath the name (small caps, `text-cream/40`, tracking-wide).
- Pending rows render the same but with a tiny `· coming soon` glyph and disabled click.

**`src/components/gallery/GalleryFilmstrip.tsx`** & **`GalleryProjectCard.tsx`**
- Card shows `LOCATION, ST` as display name, planner as eyebrow.
- Pending cards: tile gets a subtle film-grain overlay, "ARRIVING SOON" micro-label, hover disabled, no lightbox open.

**`GalleryLightbox.tsx`**
- Sidebar header: planner eyebrow → location name → year/kind line.
- If `pending`, render a single hero plate + short note instead of filmstrip.

**`src/routes/gallery.tsx`**
- Region filters stay hidden (already are).
- SEO `itemListLd` updated: `name` = location, `creator` adds planner as `contributor`.

### Out of scope (this pass)
- Uploading new folders to storage — owner is doing that next; once folders exist, swapping `pending: true` → real `*Paths` array is a one-line flip per project.
- Region/category filter UI restoration.
- Cover image final picks for newly-uploaded folders (will choose specific filenames once images land, using the close/medium/far rhythm noted above).

### Files touched
1. `src/content/gallery-projects.ts` — new schema + 15 entries
2. `src/content/gallery-manifests.ts` — keep 6 real, add 9 pending stubs, drop VanderWeide
3. `src/components/gallery/GalleryIndex.tsx` — planner eyebrow, pending state
4. `src/components/gallery/GalleryFilmstrip.tsx` — planner eyebrow, pending tile
5. `src/components/gallery/GalleryProjectCard.tsx` — same
6. `src/components/gallery/GalleryLightbox.tsx` — header shape, pending body
7. `src/routes/gallery.tsx` — SEO JSON-LD reshape

No DB, no storage writes, no migrations.
