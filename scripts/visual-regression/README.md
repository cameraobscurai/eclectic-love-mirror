# Visual regression

Catches Atelier hero / product-card misalignment before it ships.

## What it does

For every route × viewport in `config.mjs`, takes a screenshot, pixel-diffs
it against a committed baseline, and fails if more than 0.5% of pixels
changed.

```
Route                   1920   1366   768    390
/atelier                  ✓      ✓     ✓      ✓
/collection               ✓      ✓     ✓      ✓
/collection/sofas         ✓      ✓     ✓      ✓
```

## First-time setup

Playwright needs a Chromium binary on your machine:

```bash
bunx playwright install chromium
```

## Daily usage

```bash
# After making intentional visual changes — refresh and commit baselines
bun run vr:update
git add __visual__/baseline

# Before pushing — verify nothing else shifted
bun run vr:check
```

`vr:check` exits non-zero if any cell fails and writes a red-overlay diff
PNG to `__visual__/diff/<slug>-<viewport>.png`. Open that file to see
exactly what moved.

## Targeting a different URL

Defaults to the Lovable preview URL. Override:

```bash
node scripts/visual-regression/run.mjs --check --url=http://localhost:8080
# or
VR_BASE_URL=http://localhost:8080 bun run vr:check
```

## Adding routes

Edit `config.mjs` → `ROUTES`. Each entry needs:

- `path` — route to visit
- `slug` — used in filename
- `waitFor` — selector that signals the page has rendered
- `extraHeightFactor` — capture top N viewports (1.0 = just the fold)

Run `bun run vr:update` to record baselines for the new entries.

## Tuning sensitivity

In `config.mjs`:

- `DIFF_OPTIONS.threshold` — per-pixel sensitivity (0 strict, 1 loose)
- `DIFF_OPTIONS.failPixelRatio` — fraction of pixels allowed to differ
  before the cell fails (default 0.5%)

## Layout

```
__visual__/
  baseline/   committed PNGs — the source of truth
  current/    gitignored — overwritten every run
  diff/       gitignored — only populated on failure
```
