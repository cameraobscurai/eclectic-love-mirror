# SOTD Blocker Fix — Surgical Plan

Five presentation-only edits. No IA, data, route, or layout changes. Every fix is reversible in one commit. Locked invariants in `docs/DECISIONS.md` and `mem://index.md` are preserved.

---

## Guardrails (apply to every step)

- No new routes, no nav renames, no copy rewrites beyond casing.
- No new dependencies, no new packages, no schema changes.
- No edits to: `src/integrations/supabase/*`, `routeTree.gen.ts`, `.env`, `supabase/config.toml`.
- Visual diff each route before/after at 390px + 1280px — pixel parity required outside the targeted element.
- Each fix lands in its own edit batch so any single one can be reverted cleanly.

---

## 1. `/` duplicate `<h1>`

**File:** `src/routes/index.tsx`

Mobile reel block and desktop block both render `<h1>ECLECTIC HIVE</h1>`. Both are in the DOM regardless of viewport.

**Edit:** Demote the mobile wordmark (inside the frosted band) from `<h1>` to `<p>`. Keep every class, every inline style, every character of copy. Desktop `<h1>` remains the single document title.

**Why this and not the inverse:** desktop H1 already sits in the editorial fold with proper hierarchy and is what crawlers should weight. Mobile band is decorative overlay on a video.

**Verify:** `rg "<h1" src/routes/index.tsx` → 1 match. Playwright `locator('h1').count()` === 1 at 390 + 1280.

---

## 2. `/collection` missing `<h1>`

**File:** read `src/routes/collection*.tsx` first to confirm exact path.

**Edit:** Insert one `<h1>THE ARCHIVE</h1>` directly above the sticky filter band, styled in the existing micro-label register: `text-[11px] uppercase tracking-[0.3em] text-charcoal/60`. Sits on its own line, no layout shift to the grid below.

**Locked invariants preserved:** archive grid, left rail, filter band, Quick View, sort options — all untouched. Copy "THE ARCHIVE" matches the `--archive-*` token namespace and the auction-house register already documented.

**Verify:** one H1 in DOM, no CLS on filter band, grid first-row Y unchanged ±2px.

---

## 3. ALL-CAPS rule on `/gallery` and `/stylebrief`

**Files:**
- `src/routes/gallery.index.tsx` — "The Gallery" → "THE GALLERY"
- `src/routes/stylebrief.index.tsx` — "Build Your Style Brief" → "BUILD YOUR STYLE BRIEF"

Text-node edits only. No class changes, no `text-transform: uppercase` band-aid (the rule is source-of-truth caps per memory). Confirm no `<title>`/meta strings need matching updates in the same `head()`.

---

## 4. `/atelier` H1 tokenization

**File:** `src/routes/atelier.tsx`

Current text node `IMAGINED.DESIGNED.REALIZED.` tokenizes to one slug-word.

**Edit:** Add `aria-label="Imagined. Designed. Realized."` to the existing `<h1>`, and insert hairspace (`\u200A`) between the dot-separated words so visible kerning is unchanged but the crawler sees three tokens:

```
IMAGINED.\u200ADESIGNED.\u200AREALIZED.
```

No font, no size, no color change. Tagline lock from DECISIONS.md is preserved (the tagline string itself is unchanged).

**Verify:** screenshot diff against current — no visible kerning change. Screen-reader output reads three words.

---

## 5. `/stylebrief` blank first paint

**Files:** `src/routes/stylebrief.index.tsx` + hero video wrapper.

**Edit, in order:**

1. Extract a poster from the existing `src/assets/stylebrief-site-v11.mp4` via ffmpeg at t=0.5s → `src/assets/stylebrief-hero-poster.jpg` (1920×1080, q=82, target ≤180KB). One-time script, asset committed.
2. Wire `<video poster={posterUrl} preload="metadata">` on the existing hero `<video>`. No new component, no wrapper restructure.
3. Add the poster to `Route.head().links` as `rel="preload" as="image" fetchpriority="high"`.
4. Add a charcoal→cream CSS gradient backdrop on the immediate video wrapper as a zero-byte fallback that shows before the poster decodes. Uses existing tokens only — no new colors.

**No video swap, no aspect change, no Remotion re-render.** Same source file, same playback behavior.

**Verify:** Playwright screenshot at navigation `domcontentloaded` — non-blank. File size delta on first paint > 800KB vs current 141KB baseline. Lighthouse LCP on /stylebrief drops.

---

## Final verification

Single Playwright pass after all five land:

- Per route at 390 + 1280: `h1` count === 1, `h1` accessible name matches expectation.
- Visual diffs: `/`, `/atelier`, `/collection`, `/gallery`, `/stylebrief` — only the targeted regions changed.
- First-paint screenshots at `t=0ms` for `/stylebrief` are not blank.
- No console errors introduced. No new network requests besides the poster preload.

If any verification fails, that one fix reverts independently — the other four ship.
