# Owner feedback batch — REVISED with screenshot context

Two passes. Pass 1 = all the fast tickets (preview-ready before Wed 9am). Pass 2 = the two heavy layout rebuilds (homepage collage, collection landing).

## What the screenshots clarified

| Ticket | Was ambiguous | Now confirmed |
|---|---|---|
| 2 (home collage) | Layout unclear | 7-tile asymmetric collage, not 8-grid. Wide left canyon · 2 stacked center-left · tall center w/ "ECLECTIC HIVE" overlay · 2 stacked center-right · wide right canyon |
| 5 (dup text) | Which instance? | Remove the *upper* "WE ARE DESIGNERS, PRODUCERS, AND A FABRICATION HOUSE." eyebrow |
| 16 (FAQ) | Where? | DEFER — owner said "let me noodle on this for a sec" |
| 17 (capitalize) | Already caps? | The stencil/serif rendering reads as caps but JSX is Title Case. Switch JSX strings to literal CAPS |
| 19 (collection) | Layout? | Left H letterform with small object tucked in + "the HIVE" + "SIGNATURE COLLECTION". Right = 3-col category tile grid |
| 21 (filter row) | Build new? | Already exists — render existing toolbar (Search, Sort By Type, grid/list toggle) in the new landing layout |
| Adrienne | Replace with what? | Owner is supplying her preferred photo |
| Phase 2 triptych | Permanent? | Remove for now, revisit Phase 2 |

## Pass 1 — fast tickets (all of these in one shipment)

```text
src/routes/index.tsx
  └─ T1   Disable hero parallax. Drop useScroll/useTransform on home hero,
          remove motion x/y/scale on the <picture>, keep static composition.

src/routes/atelier.tsx
  ├─ T3   Tighten top padding above hero text block.
  ├─ T4   Replace atelierHero <HeroImage> with [ATELIER PORTRAIT] placeholder
          (4/5 aspect, dashed cream border, centered label) — owner sending
          the bench-with-tasseled-throws photo.
  ├─ T5   Remove the UPPER "WE ARE DESIGNERS, PRODUCERS, AND A FABRICATION
          HOUSE." block (the small eyebrow above IMAGINED/DESIGNED/REALIZED).
          Lower instance under THE HIVE stays.
  ├─ T11  Section 3 (currently "THE ARTIST'S STUDIO"):
          - Rename eyebrow → "L'ATELIER"
          - Replace the 1-wide + 2-up image stack with a single 3-tile row
            of [STUDIO COLLAGE 1/2/3] placeholders matching her B&W triptych
            (Hive exterior · interior workspace · interior workspace).
  ├─ T12  Rename label "WORKBENCH" → "FABRICATION".
  ├─ T13  Rename "WAREHOUSE" tile label → "DESIGN", and reorder the
          FABRICATION/DESIGN pair so DESIGN renders FIRST.
  ├─ T15  Remove the desaturated 3-image triptych (fabricationStillLife,
          fabricationFoliage, fabricationTentTriptych) — Phase 2 deferral.
  └─ T17  IMAGINED/DESIGNED/REALIZED triplet — change JSX strings from
          "Imagined." → "IMAGINED" (drop trailing periods, full caps in
          source so screen readers match the visual register).

src/components/atelier/team.tsx
  ├─ T6   Annie — apply object-position adjustment so her full head sits
          inside the aperture and scale matches siblings.
  ├─ T7   Annie + Amanda + Cat — wrap their images with className
          `[&_img]:[filter:contrast(1.05)_saturate(1.05)]`. If still grainy
          after preview, FLAG to owner that source files need replacement.
  ├─ T8   Judy — neutral white-balance correction filter
          (slight saturate down + warm hue shift) until replacement lands.
  ├─ T9   Adrienne — keep aperture as waiting state with [ADRIENNE
          REPLACEMENT] note; she's sending her preferred file.
  └─ T10  Remove "Sarah Lilly-Ray" entry from TEAM array entirely.

src/routes/__root.tsx
  └─ T18+T22  Remove "/contact" and "/collection" from the hideFooter list
              so the global Footer renders on all editorial pages.
              (Atelier already has it — verify in preview.)

src/routes/contact.tsx
  ├─ T23  Replace intro paragraph with:
          "We would love to hear about your project and how we can support
          your needs. Every inquiry is personally reviewed and will be
          answered within 24 hours. Thank you for reaching out to us!"
  ├─ T24  Rename "STUDIO" label → "ATELIER".
          (Email stays lowercase per ticket; "Denver, Colorado" stays
          Title Case — Core memory says place names follow body-case rules,
          and the screenshot shows her values are Title Case, only the
          field labels are caps. CONFIRM at Wed review if she wants the
          value uppercased too.)
  └─ T25  Replace textarea placeholder with:
          "Colorway, materials, inventory references, and venue details
          are all great places to start."

DEFERRED (owner said "let me noodle"):
  • T16  FAQ placement on Atelier
  • T14  Explanation of THE FABRICATION numbered list — I'll write a short
         note for Wed: it's the static CAPABILITIES roster (Lounge
         Furniture, Bars + Cocktail Tables, etc.) — purely a typeset
         capabilities index, not interactive, doesn't link to Collection.
```

Placeholder convention: `aspect-ratio` matches the original, `bg-charcoal/[0.04]`, dashed `border-charcoal/25`, centered label in `text-[10px] tracking-[0.28em] uppercase text-charcoal/45`. Owner explicitly asked for visible placeholders so they read as intentional.

## Pass 2 — heavy layout rebuilds (separate shipment)

```text
src/routes/index.tsx
  └─ T2   Homepage hero collage — 7-tile asymmetric grid:
            ┌──────┬──┬──────┬──┬──────┐
            │      │  │      │  │      │
            │ wide │ +│ tall │+ │ wide │
            │ left │  │  +H  │  │ right│
            │      │  │ logo │  │      │
            └──────┴──┴──────┴──┴──────┘
          - Replace single <picture> with collage of 7 [HERO PANEL n] tiles.
          - "ECLECTIC HIVE" wordmark overlaid centered on the tall middle
            panel (keep current font-brand, letterspacing breathing OK).
          - Drop LiquidGlass CTA bar (ticket also requests static, no bounce).
          - Re-anchor the speculation-rules + preload to the collage's
            primary tile (left wide) rather than the old single hero asset.

src/routes/collection.tsx + components
  └─ T19+T20+T21+T22  Collection landing reformat:
          - Remove CollectionRail left sidebar (T20).
          - Two-column landing:
              LEFT  = stacked composition:
                       "the HIVE" (italic display)
                       Giant H letterform (display font, ~clamp(12rem,30vw,28rem))
                       Small inventory object photo tucked at base of H stem
                         ([COMPOSITION OBJECT] placeholder)
                       "SIGNATURE COLLECTION" (caps tracking)
              RIGHT = 3-col masonry of category tiles
                       [CATEGORY: SEATING] [CATEGORY: TABLES] etc.
                       one tile per BROWSE_GROUP (14 entries)
          - Above the right grid, render the existing toolbar:
              Search pieces · Sort By Type · grid/list toggle (T21)
          - Footer auto-renders once /collection removed from hideFooter.
          - Clicking a category tile commits the group filter and routes
            into the existing browse view (no behavior change downstream).
```

## Wednesday talking points (I'll prep notes)

- T17: confirm she likes JSX-as-CAPS solution.
- T16: where she wants FAQs (Atelier vs Contact vs both).
- T14: THE FABRICATION list — I'll explain it's the static capabilities roster; ask if she wants it linked to Collection categories.
- Image quality: flag Annie/Amanda/Cat/Judy if CSS filters can't recover them — request fresh files.
- Footer copy: her email signature has phone numbers + "COLORADO BASED | DESTINATION BOUND" — offer to fold those into the footer.
- T24: confirm whether "Denver, Colorado" value should also go uppercase.

## Out of scope per owner

- FAQ page (under review)
- Gallery page ("we can look at this page last")

## Order of operations

1. Approve plan → I ship Pass 1 in one go.
2. You QA preview link.
3. After Pass 1 lands, I ship Pass 2 (homepage collage + collection landing) in a separate message so the two big rebuilds don't block the 18 small fixes.

Approve and I'll start Pass 1.
