# Gallery — Honor the v0 Original

You're right. The deployed v0 site (`v0-eclectic-hive-website.vercel.app/gallery`) has a very specific cinematic design we should match, not reinvent. I navigated it end-to-end. Here's what we restore.

## What v0 actually is

### Index page (`/gallery`)
- Charcoal page, top masthead.
- Eyebrow `THE GALLERY`, then a big serif headline showing the live count: **`{n} Environments`** (so we render `6 Environments`).
- Right-aligned lead paragraph: "Each project represents a complete expression of design intelligence, fabrication capability, and production expertise."
- Category filter pills under the headline: `ALL · LUXURY WEDDINGS · MEETINGS + INCENTIVE TRAVEL · SOCIAL + NON-PROFIT` with live counts. Selected pill = cream fill on charcoal text.
- **The big move:** a horizontal track of huge environment cards, each ~50vw wide and tall. Each card has a small `01` numeral top-left, a small region tag (e.g. `Utah`), a giant cover image, and below: `### Amangiri` (serif), then `Canyon Point, Utah · Private Celebration`.
- Below the track: a centered slot indicator (`01 — 02 …`), italic helper line **"Drag or scroll to explore"**.
- Below that: a flat **Project Index** strip — `01 Amangiri · Private Celebration · 2024  |  02 Lynden Lane · Wedding · 2025 …` — clickable, jumps the track to that card.
- Bottom CTA section: "Ready to add your environment to our archive?" + Start an Inquiry button.

### Lightbox (the cinematic part)
Clicking a card opens a full-screen split overlay (no separate route — confirmed: `/gallery/lynden-lane` is a 404 on v0, it's all in-page):

```text
┌────────────────────────────────────────────┬────────────────────┐
│                                            │ ✕                  │
│                                            │                    │
│           full-bleed hero image            │   01 / 24          │
│           (≈ 65% width, full height)       │                    │
│                                            │   UTAH             │
│                                            │   Amangiri         │
│                                            │   ──────           │
│                                            │   Canyon Point ·   │
│                                            │   Private          │
│                                            │   Celebration ·    │
│                                            │   2024             │
│                                            │   ──               │
│                                            │   short copy       │
│                                            │                    │
│                                            │   ‹ PREV   NEXT ›  │
├────────────────────────────────────────────┴────────────────────┤
│ [▢][▢][▢][▢][▢][▢] … thumbnail filmstrip … 01 ──── 24            │
└──────────────────────────────────────────────────────────────────┘
```

- Left ~⅔: the hero plate. Big floating right-side `›` arrow (and matching left `‹`) on hover/idle to advance plates.
- Right ~⅓ (charcoal panel): close button top-right, plate counter `01 / 24`, region eyebrow, **giant serif project name**, location · type · year, short paragraph, then **PREV PROJECT / NEXT PROJECT** controls (move between projects, not plates).
- Bottom: horizontal **thumbnail filmstrip** across both panels with a `01 ──── 24` progress rule beneath it.
- Mouse navigation: clickable Prev/Next plate arrows, clickable thumbnails, scroll-wheel paginates plates, keyboard `←/→` plates, `↑/↓` projects, `Esc` closes.

That solves the "how does a mouse user explore" problem natively.

## What to build

### Files

**Edit**
- `src/routes/gallery.tsx` — rewrite to match v0 index: masthead with live `{n} Environments`, category pills, horizontal cards track, project index strip, CTA. Drop the current filmstrip + ghost scaffold.
- `src/content/gallery-projects.ts` — extend each project with: `region` (e.g. "Utah", "Colorado", "Montana"), `kind` (e.g. "Private Celebration", "Wedding", "Welcome Party") and a `summary` paragraph (~25 words). Real data only — pulled from manifest folder names + your existing `category`. No invented copy beyond what we already have factual basis for.

**New components** (under `src/components/gallery/`)
- `GalleryMasthead.tsx` — eyebrow, live `{n} Environments` headline, lead paragraph, category pills with counts.
- `GalleryCardsTrack.tsx` — horizontal track of huge environment cards with: scroll-snap, mouse-wheel-to-horizontal translation, drag-to-scroll, visible left/right paddle buttons (cream/40, hover cream) at the track edges, slot indicator + "Drag or scroll to explore" beneath, Project Index strip below. Owns the `selectedProject` state and opens the lightbox.
- `GalleryEnvironmentCard.tsx` — one big card. Number, region tag, hero image (lazy after first), serif name, meta line.
- `GalleryProjectIndex.tsx` — flat index row that jumps the track to a card.
- `GalleryLightbox.tsx` — the split overlay. Owns plate index, project navigation, scroll lock, keyboard, scroll-wheel-to-plate.
- `GalleryLightboxRail.tsx` — bottom thumbnail filmstrip with `01 ──── n` progress rule and click-to-jump.

**Delete**
- `src/components/gallery/GalleryFilmstrip.tsx` — replaced.
- `src/components/gallery/GalleryEmptyFilmstrip.tsx` — we always have content.
- `src/components/gallery/GalleryProjectPanel.tsx` — replaced by `GalleryLightbox`.
- `src/components/gallery/GalleryThumbnailStrip.tsx` — superseded by `GalleryLightboxRail`.

### Mouse-friendly navigation (the explicit ask)
- Horizontal track listens to `wheel` events: vertical wheel delta → `scrollLeft += deltaY` (so a mouse wheel actually moves the rail). Trackpad horizontal gestures pass through unchanged.
- Visible **paddle buttons** on the track edges, not just snap.
- Drag-to-scroll on the track (mousedown → move).
- Project Index entries are buttons that call `scrollIntoView({ behavior: "smooth", inline: "center" })` on the matching card.
- Lightbox: visible `‹ ›` arrows, `wheel` paginates plates, `←/→` keys plates, `↑/↓` keys projects, click thumbnails to jump.

### Visual / typography
- Charcoal `#1a1a1a` background, cream type. Honors locked Gallery=cinematic role.
- Cormorant Garamond display for project names + the masthead headline. Inter ALL CAPS for nav, eyebrows, pill labels, plate counters, PREV/NEXT, the `Drag or scroll to explore` helper kept lowercase italic per v0.
- Tracking presets per the typography memory.

### Empty/edge cases
- If user picks a filter with zero matches, the track shows a single quiet line "No projects in this category" — no fake placeholders.
- All `loading="lazy" decoding="async"` except first card hero (eager).

## Open question

The lightbox right-side panel description on v0 reads as factual placeholder copy ("A bespoke environment crafted by Eclectic Hive…"). I'd rather generate one real ~25-word `summary` per project drawn from facts we know (region, venue type, season). Two options — pick one, or I default to **A**:

- **A. Author one factual `summary` per project** based on the manifest folder/region/year (e.g. Amangiri → "An incentive program staged inside the Amangiri landscape — long-table dinners against the sandstone, lounge moments at canyon's edge."). I'll keep them under 30 words and grounded in what's visible.
- **B. Omit the description entirely** in the lightbox panel. Just plate counter, region, name, meta line, PREV/NEXT — let the photographs speak.

Out of scope: per-project subroutes, filtering inside the lightbox, new photography. Index uses the existing `gallery-manifests.ts` paths only.