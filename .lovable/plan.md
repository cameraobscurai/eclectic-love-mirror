## Revised plan — Steps 1, 2, 3

I re-checked all three against current code before rewriting. One is already done.

---

### Step 1 — Publish also snapshots gallery order — **ALREADY SHIPPED**

`publishCatalogOverlay` in `src/lib/photos-admin.functions.ts` now reads `gallery_orders` and writes a timestamped `catalog/gallery-orders-{stamp}.json` blob. `src/routes/gallery.tsx` tries that overlay first and falls back to the baked `src/data/gallery/gallery-orders.json`.

Nothing to build. What's left is a **verification pass**, not code: reorder a gallery in `/admin/photos`, hit Publish, hard-reload `/gallery`, confirm the new order lands without a rebake. If it fails, that's a bug report, not this step.

---

### Step 2 — Desktop hero unmute parity — **OPEN, still correct**

Mobile `SequentialHeroVideo` has the full pattern: a `muted` state, an aria-labelled toggle, and re-application of the user's choice across clip changes. Desktop `HeroFilmstrip` hard-forces `v.muted = true` on every strip video; only the lightbox ever unmutes.

Revision to the original plan: the strip is **five simultaneous videos**, not one. Copying the mobile chip verbatim would unmute all five at once — five overlapping audio tracks. Correct behavior is one audio source at a time.

- Audio follows the **active/hovered** frame only; every other frame stays muted.
- The chip is a single site-level control, not one per frame.
- The choice persists across frame transitions, same as mobile.
- Respects `prefers-reduced-motion`/no-video fallback — no chip when there's no video.

---

### Step 3 — Repo hygiene sweep — **OPEN, scope confirmed larger than written**

Actual count: **148 files in `scripts-tmp/`** and **56 root-level loose scripts** (`.mjs`/`.cjs`/`.py`/`.js`/`.ts`).

Revision: the original plan said "delete." Given the standing dead-code rule, deletion is the last step, not the first.

1. Produce a **manifest** classifying every candidate: referenced / unreferenced / ambiguous. Grep each name against `src/`, `scripts/`, `supabase/`, `package.json`, `playwright.config.ts`, and `.lovable/`.
2. Move genuine keepers into `scripts/audit/` (the existing convention).
3. Show you the delete list. Nothing is removed until you look at it.
4. Then remove, and verify with a build plus `console-health.spec.ts`.

Note: `console-health.spec.ts`, `audit-pages.spec.ts`, and the other root `.spec.ts` files are **live CI specs** — they are not junk and stay put.

---

## Recommended order

Step 2 first — it's the only one with a user-facing outcome, and it's the remaining half of the owner's original sound complaint. Step 3 second, since it's zero-risk but noisy and better done in one uninterrupted pass. Step 1 is just the verification click-through, which can happen any time.

## Technical notes

- Step 2 touches `src/components/home/HeroFilmstrip.tsx` only; the mobile component is not modified.
- Verification for Step 2 is Playwright at desktop viewport: click the chip, assert `muted === false` on the active clip and `true` on the other four, then assert the state survives a frame transition.
- Step 3 will not touch `remotion/`, `scripts/visual-regression/`, or anything under `scripts/` that `package.json` references.
