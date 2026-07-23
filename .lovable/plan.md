# Next Sequence — Depicted Step by Step

Ordered by risk (low → higher) and by what unblocks the next step. Every step is independently shippable and independently revertable.

---

## Step 1 — Finish the Publish story (30 min, zero risk)

**Problem:** `publishCatalogOverlay` snapshots inventory only. Admin gallery reorders in `/admin/photos` won't reach live until the next full `bake-catalog.mjs` run. Half a feature.

**Change:**
- `src/lib/photos-admin.functions.ts` → extend `publishCatalogOverlay` to also read `gallery_orders` and write `squarespace-mirror/catalog/gallery-orders.json`.
- `src/routes/gallery.tsx` → try the static snapshot first (same pattern as inventory overlay), fall back to the baked JSON we just shipped.
- Publish button label stays "Publish to live site" — one button, both surfaces.

**Verify:** reorder a gallery in `/admin/photos`, click Publish, hard-reload `/gallery`, confirm new order without a rebake.

---

## Step 2 — Desktop hero unmute parity (20 min, zero risk)

**Problem:** Mobile `SequentialHeroVideo` has a tap-to-unmute button. Desktop `HeroFilmstrip` does not. Jill's complaint was site-wide, we only fixed half.

**Change:** port the unmute chip pattern from `SequentialHeroVideo.tsx` into `HeroFilmstrip.tsx`. Same iconography, same position bias, same "sticky-unmuted" behavior across clip transitions.

**Verify:** Playwright on desktop viewport, click chip, assert `video.muted === false` on the active clip and the next one after transition.

---

## Step 3 — Repo hygiene sweep (1 hour, zero risk, do while builds run)

**Problem:** ~200 files in `scripts-tmp/` + a dozen root-level `.mjs`/`.cjs`/`.py`/`.js` audit scripts pollute the tree and slow every `rg` I run.

**Change:**
- Move keepers to `scripts/audit/` (already the convention).
- `rm -rf scripts-tmp/`.
- Delete root-level one-shot scripts (`audit.mjs`, `audit.ts`, `audit_*.{cjs,mjs,py}`, `scan_tmp.cjs`, `tmp_script.cjs`, `tiles_tmp_script*.cjs`, `screenshot*.{js,mjs,cjs}`, `take_screenshot.*`, `list_links.js`, `get_dims.*`, `download_*.py`, `chandeliers_data.json`, `analyze_*.mjs`).
- Grep every deletion against `src/`, `scripts/`, `supabase/`, `package.json`, `.lovable/` per the dead-code fear rule. Anything imported anywhere stays.

**Verify:** `bun run build` + `console-health.spec.ts` still green.

---

## Step 4 — Pass 4 from the plan: platform-native scroll reveal (half day, low risk)

**Problem:** `EvolutionNarrative` drives its reveal off `requestAnimationFrame` + scroll listeners. Modern Chromium/Safari support scroll-driven animations natively (`animation-timeline: view()`), which is smoother and cheaper.

**Change:**
- Port the reveal to CSS `@property` + `animation-timeline: view()` inside `@supports (animation-timeline: view())`.
- Keep the existing JS path inside `@supports not (animation-timeline: view())` as the Firefox fallback.
- No behavior change at resolved state.

**Verify:** visual diff Chromium (native path) vs. Firefox (JS path); both land on identical final frame. Reduced-motion respected in both.

---

## Step 5 — Prototype Pass 5 before coding it (async, blocks Step 6)

**Problem:** "The Index That Grows" unifies `DestinationStack`, `GalleryIndex`, and the atelier FAQ accordion into one signature component (`<GrowingIndex>`). Touches 4 surfaces. Wrong choice = rework across all of them.

**Change:** I generate 2-3 rendered HTML prototypes via `design--create_directions` covering:
- Row density + tabular-nums numbering style
- Preview thumbnail geometry (fixed square vs. aspect-adaptive)
- Hairline/border weight in the paper palette

You pick one via `questions--ask_questions`. No code lands until you pick.

---

## Step 6 — Ship Pass 5 (1-1.5 days, medium risk, gated on Step 5)

**Change:** Build `<GrowingIndex>` from the chosen prototype. Migrate one surface at a time:
1. `/gallery` (smallest blast radius, lowest traffic)
2. `/atelier` FAQ
3. `/collection` overview aside (if applicable)
4. Home `DestinationStack` last

Keep old components alive per surface until migration proves out.

**Verify:** visual regression screenshots on all 4 surfaces before/after each migration. `console-health.spec.ts` + `audit-pages.spec.ts` after each.

---

## Not on this list (deliberately)

- **Product photo consistency** — not a code fix. Needs an owner call with Jill on which SKUs get re-shot.
- **Pass 0/1/2/3 from `.lovable/plan.md`** — already shipped in the meeting-prep sprint.
- **Any memory rewrites** — hold until each step ships and holds for 24h, per project discipline.

## Suggested cadence

- **Today:** Steps 1, 2, 3 (all ship in the same session, all zero-to-low risk).
- **Tomorrow AM:** Step 4.
- **Tomorrow PM:** Step 5 prototypes → you pick.
- **Day 3-4:** Step 6 rollout, one surface per commit.

Want me to start with Step 1?
