
# Style Board — Editorial Deck Rebuild

The existing 3-up grid is wrong. The "hive style guide" project (24bdb7d7) already has the right answer shipped: a **21-block proposal system** with asymmetric production grids that mimic real Eclectic Hive PDFs, 6 cover variants, page chrome, and PDF export. Port that system to /dev-server, drive it from the Natasha board, ship Pass 1 tonight. Layer AI scene staging (nano banana 2) on top in Pass 2.

---

## Reference asset inventory

Already in `/dev-server` — reuse, do not rebuild:
- `src/lib/color-engine.ts` — palette/tones/insights (working)
- `src/lib/studio.functions.ts::getStyleBoardByToken` — public fetcher (just patched to join on rms_id)
- `src/components/studio/*` — admin builder primitives
- `style_boards` table — palette/tones/insights/pinned_rms_ids/curator_notes/pin_notes/inspo_images
- `inventory_items.images[]`, `card_background_url`, `category`
- Saol Display, charcoal/cream tokens, page-title class, editorial-link, view-transition lib

Porting from project `24bdb7d7`:
- `src/components/proposal/ProposalPreview.tsx` (755 lines, 21 block types)
- `src/components/proposal/blocks/{Cover,MoodHero,ProductionPage,Palette,Tones,SectionDivider,Statement,Closing}.tsx`
- `src/lib/export-utils.ts` (`downloadProposalPDF`, `downloadProposalPagesZip`)
- `GRID_PATTERNS` 1-6 asymmetric grid from `ProductionPageBlock`
- `PageChrome` pattern (eyebrow top-left, date top-right, brand+prepared-by bottom-left, page count bottom-right)

Porting from project `d389551e` (Pass 2 only):
- `src/pages/DesignStudio.tsx::callStudio` pattern — single edge endpoint, tool-discriminated payload, base64 in / signed url out
- Room/Lifestyle/Venue/Campaign tool prompt registry

---

## Pass 1 — Editorial deck rebuild (ships tonight)

Single deliverable: `/studio/<token>` becomes a paginated editorial deck with chrome on every page, PDF export in the corner.

### Page order (auto-generated from the board)

```text
01  COVER             cover variant: "asymmetric" — single product image (or
                     card_background of pinned hero), date top-left,
                     ECLECTIC HIVE wordmark mid-left, "For Natasha Sharma"
                     bottom-right, project title bottom-right serif

02  MOOD HERO         oversized project title (clamp 4rem→8rem Saol),
                     3-image row aspect-[4/5] of top inspo OR top 3 hero
                     products if no inspo, client name eyebrow

03  STATEMENT         curator notes hero pull-quote, centered, 5xl serif,
                     eyebrow "DIRECTION" — split into 1-3 statement pages
                     if notes are long (split on blank lines)

04  PALETTE           7 swatches as aspect-square cards, hex mono caption,
                     name eyebrow ("MOSS", "CHESTNUT" — added to seed)

05  TONES             single italic line "Warm-muted, garden-table register"
                     derived from highest tone ratio; "DIRECTION" eyebrow,
                     section number 02

06  SECTION DIVIDER   full-bleed word "PIECES" 9xl serif over dimmed
                     opacity-60 collage of pinned images (animated mosaic
                     CSS grid)

07-N PRODUCTION PAGE  ONE per category, in this fixed order:
                       seating · lighting · rugs · pillows-throws ·
                       tableware · serveware · styling · candlelight ·
                       chandeliers · large-decor · storage · furs-pelts
                     Eyebrow: category name + count "STYLING (07)"
                     Italic subtitle: one-line factual ("Seven hand-formed
                     vessels — group in odd clusters of 3 and 5.")
                     Asymmetric 12-col grid using GRID_PATTERNS[1..6];
                     7+ items tile in 4-col uniform grid

N+1 CLOSING           charcoal page, ECLECTIC HIVE wordmark centered,
                     mailto:hello@eclectichive.com CTA, date prepared

Footer chrome on every page: "ECLECTIC HIVE · Prepared by Jill · For
Natasha Sharma" left, "07 / 12" right, 10px tracking-[0.32em]
```

### Files to create

```text
src/routes/studio.$token.tsx           rewrite — replace 146-line component
src/components/studio/board/
  ├── BoardDeck.tsx                    page-loop wrapper, chrome
  ├── PageChrome.tsx                   eyebrow + page-count
  ├── CoverPage.tsx                    asymmetric cover variant
  ├── MoodHeroPage.tsx                 3-image + oversized title
  ├── StatementPage.tsx                centered pull-quote (multi-page split)
  ├── PalettePage.tsx                  7-swatch grid with names
  ├── TonesPage.tsx                    single italic tone line
  ├── SectionDividerPage.tsx           full-bleed word + dim collage
  ├── ProductionPage.tsx               asymmetric category grid
  └── ClosingPage.tsx                  charcoal CTA page
src/lib/board-deck.ts                  buildPages(board, items) → Page[]
                                       GRID_PATTERNS, category order,
                                       tone-to-label mapping
src/lib/board-export.ts                downloadDeckPDF, downloadDeckPNGs
                                       (port + adapt from style guide)
```

### Server side

Extend `getStyleBoardByToken` return shape — already includes `pinned[]` with `id/rms_id/title/image_url/category/note`. Add to its select projection:
- `card_background_url` per pinned item (for cover background)
- `dimensions_raw` (for production page captions)
- `quantity_label` (for "× 12" markings on production pages)

One small migration: add `style_boards.cover_pinned_rms_id text` so admin can pick the cover piece. Default to first pin if null. RLS + GRANT exactly as documented.

### Seed the Natasha board for the morning

In the same change:
- Update palette JSON with `name` field: moss, sage, chestnut, terracotta, cream, gold, char
- Set `cover_pinned_rms_id = '707'` (Evren kilim — the floor anchor)
- Set `pin_notes` for the 7 vases: "group in odd clusters of 3 and 5", and for Midas flatware: "the only metal in the room"

### Print + PDF

Two paths, both required:
1. **PDF export button** — top-right of `/studio/<token>` (only visible when viewed by Jill, hidden otherwise via a `?download=1` querystring). Uses html2canvas + jsPDF, one canvas per `data-board-page` element, captures at 2x device pixel ratio, embeds in letter or A4 portrait.
2. **Print stylesheet** — `@page { size: letter portrait; margin: 0 }`, page-break-after on each `[data-board-page]`, hide chrome ornaments that don't print well. Cmd+P → save as PDF works as a fallback.

### Polish layer (no new infra)

Reuse what's already in `/dev-server`:
- Scroll-driven reveal on each page entrance (existing IntersectionObserver pattern in `src/components/`)
- View transition on cover→deck (existing `view-transition.ts`)
- Saol Display block load (already configured)
- Page numbers in `tabular-nums font-mono` for proposal feel

### What changes for Natasha specifically

No code path forks. The deck is fully data-driven — every other future board renders the same way.

### Out of scope tonight

- No nav, no header beyond wordmark
- No client-side actions (approve/reject/comment)
- No email (DNS still pending)
- No drag-from-catalog in admin builder
- No nano banana 2 (that's Pass 2)

### Success check before "done"

1. `/studio/natasha-aug2026-garden` at 1440/1024/390 — every page reads as a magazine spread
2. PDF export downloads a 12-ish page letter portrait, every page legible
3. Page chrome consistent on every page, page count correct
4. Production page grids look asymmetric and intentional for categories with 1-6 items, neat 4-col tile for 7+ (styling has 7)
5. Cover, mood hero, section divider, closing all use Saol oversized headlines (clamp ≥4rem)
6. No horizontal overflow at 390px; deck collapses to single-column stack on mobile
7. Print preview in Chrome — full deck paginates cleanly

---

## Pass 2 — Nano banana 2 scene staging (ships after morning approval)

Goal: each production page gets one AI-rendered scene at the top showing the category's pieces composed together in a candlelit garden-table context — same brand language as the still photos but with depth and atmosphere.

### Architecture

Server route, not server fn (image gen streams):
```
src/routes/api/studio.stage.ts        POST { boardId, categorySlug, mode }
                                      → image url after stream completes
```

Pipeline per category:
1. Fetch the board's pinned items in that category — title, image_url, dimensions_raw
2. Build a prompt template per category (seating / tableware / etc.) with the project palette + tone language injected — "moss-and-chestnut late-summer garden table, candlelit, low warm light, cinematic editorial composition, ARRI Alexa look"
3. Pass the actual product image URLs in via Gemini's image-input modality (the `messages` shape for `google/gemini-3.1-flash-image-preview` accepts image content blocks)
4. Stream `image_generation.partial_image` events to the admin builder so Jill sees the render appear
5. On `image_generation.completed`, upload to `studio-staging` bucket at `<board_id>/<category_slug>.png`, return public URL
6. Persist to a new column `style_boards.staged_scenes jsonb` keyed by category slug

Admin builder gets a "Stage scene" button per category section. Public deck renders the staged scene at the top of each production page if present, falls back to a hero pinned image if not.

### Storage

- New bucket `studio-staging` public read, admin write
- One PNG per board × category (~12 images per board max)
- Regenerate overwrites; old version goes to `images_archive`-style jsonb history

### Cost guard

- Manual trigger only — never auto-generate
- Idempotent: if `staged_scenes[category]` exists, button says "Regenerate" with a confirm
- Per-board budget surfaced in admin: "12 scenes × ~$0.04 = ~$0.50"

### Out of scope

- No "stage every scene with one click" — too easy to burn credits
- No per-piece staging (whole-category composition only)
- No video generation
- No editing/inpainting flow (yet)

---

## Risk register

| Risk | Mitigation |
|---|---|
| PDF export looks bad at letter portrait | html2canvas captures actual DOM — what you see is what prints. Hairline rules and tracking-heavy caps are designed for print. Test deck at 816×1056px viewport before claiming done. |
| Production page grids look wrong for unusual counts | GRID_PATTERNS only covers 1-6 explicitly. 7+ falls to uniform 4-col. Verify category counts: styling=7, large-decor=1, seating=5, lighting=2, etc. |
| `card_background_url` empty for most pieces | Cover falls back to first pinned image. No blocker — Natasha's Evren kilim has a clean cutout already. |
| Saol Display doesn't render in PDF | Already configured `font-display: block` site-wide. html2canvas inherits computed styles. Pre-load Saol via `<link rel="preload">` in `<head>` before export trigger. |
| Subagent couldn't deep-link from /admin/studio to the deck preview | Add "PREVIEW DECK" link in admin builder that opens `/studio/<token>?preview=1` in new tab — no real change, just discoverability. |

---

## What I am NOT promising

- Awwwards SOTD-level micro-interactions everywhere — that's months of polish
- AI staging tonight — too risky for morning demo
- Email delivery — your DNS call
- Replacing the admin builder — only the public client view changes

The deck format is the bar. Hive style guide's `ProposalPreview` already cleared it for their own project; porting it here closes the loop.
