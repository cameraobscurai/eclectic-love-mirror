## Goal

Catch Atelier hero / product-card misalignment **before** changes ship by running a scripted screenshot diff at four breakpoints (1920, 1366, 768, 390) against approved baselines.

## Approach

A small Playwright-based visual-regression script lives in `scripts/visual-regression/`. It:

1. Boots the local Vite dev server (or hits a passed-in URL).
2. For each route × viewport, takes a full-page screenshot, masks volatile regions (filmstrip videos, Ken-Burns hero motion, cursor dot), and writes it to `__visual__/current/`.
3. Pixel-diffs against `__visual__/baseline/` using `pixelmatch`. Anything over a small threshold (default 0.5%) writes a red diff PNG to `__visual__/diff/` and exits non-zero.
4. Run modes:
   - `bun run vr:update` — refreshes baselines (use after an intentional design change).
   - `bun run vr:check` — runs the diff. Prints a table of PASS/FAIL per cell.

## Coverage matrix

| Route | 1920×1080 | 1366×768 | 768×1024 | 390×844 |
|---|---|---|---|---|
| `/atelier` (hero) | ✓ | ✓ | ✓ | ✓ |
| `/collection` (overview tiles) | ✓ | ✓ | ✓ | ✓ |
| `/collection/sofas` (product grid) | ✓ | ✓ | ✓ | ✓ |

12 screenshots per run. Each route is captured at viewport-only crop *and* a second hero-region crop (top 1.2× viewport height) so subtle hero misalignment surfaces even when the rest of the page shifts.

## Volatile-region masking

To avoid false positives from animation:

- HeroFilmstrip videos → masked rectangle.
- EvolutionNarrative scroll-driven opacity → not in scope (not on these routes).
- Ken Burns `transform: scale()` on hero — script waits for `prefers-reduced-motion` toggled via Playwright's emulateMedia + a `?vr=1` query param the routes respect to freeze first frame.
- Dot cursor → CSS injected at script start hides `[data-cursor]`.

## Files to add

```text
scripts/visual-regression/
  run.mjs              ← Playwright launcher, viewport loop, diff orchestration
  config.mjs           ← routes × viewports × masks
  README.md            ← how to update baselines, interpret diffs
__visual__/
  baseline/            ← committed PNGs (12 files initially)
  current/             ← gitignored, fresh each run
  diff/                ← gitignored, only populated on failure
```

`package.json` scripts:

```json
"vr:check":  "node scripts/visual-regression/run.mjs --check",
"vr:update": "node scripts/visual-regression/run.mjs --update"
```

`.gitignore` adds `__visual__/current/` and `__visual__/diff/`.

## Technical details

- Deps: `playwright` + `pixelmatch` + `pngjs` (dev only). ~80 MB Chromium download — acceptable, only runs when invoked.
- Threshold: 0.5% changed pixels per image (pixelmatch threshold `0.1` per pixel). Tunable in `config.mjs`.
- Baseline source: first run after this lands. Owner / you reviews the 12 baselines, commits them.
- Workflow: run `bun run vr:check` locally before pushing visual changes. Failing diffs print absolute path to the `diff/<route>-<viewport>.png` so the issue is immediately visible.
- Not wired into CI yet — Lovable's preview server is the target. Adding GitHub Actions later is a one-file change.

## Out of scope (call out to user)

- Cross-browser (only Chromium).
- Diffing every page (only the three highest-risk surfaces; easy to extend in `config.mjs`).
- Auth-gated routes (`/admin/*`).
- Automatic baseline updates on CI — must be a human decision.

## Open questions before I build

1. **Run target**: local `vite dev` (script spawns it) or the live preview URL?
2. **Baselines in git**: commit the 12 baseline PNGs to the repo (recommended, makes diffs reviewable in PRs) or store in `/mnt/documents`?
3. **Extra routes now or later**: add `/`, `/contact`, `/gallery` to the matrix on day one, or start with just the three above?