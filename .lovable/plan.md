## Two small token changes

### 1. Flatten the brand base from paper-white to pure white
In `src/styles.css`:
- `--cream`: `#fafaf7` → `#ffffff`
- `--paper`: `#fafaf7` → `#ffffff`
- Leave `--cream-accent` (#fafaf7) alone — kept as the optional warm accent for any one-off uses.
- Revert the temporary `#ffffff` override I just inlined on `src/routes/collection.tsx` line 576 back to `var(--paper)` so the whole site repaints together from a single token.

Effect: every surface using `--paper` / `--cream` (collection, atelier, gallery filters, footer text on dark, etc.) becomes flat white, so cutout product photos blend in seamlessly.

### 2. Greyscale the category overview checkerboard
In `src/components/collection/CategoryTonalGrid.tsx` line 39:
```
const TONES = ["#f5f3ee", "#ebe5d8"] as const;   // warm tan pair
```
Swap to a neutral greyscale pair, both still within ~6% of white so the rhythm stays subtle, no warm cast:
```
const TONES = ["#ffffff", "#f1f1f1"] as const;   // white + soft grey
```

### Memory update
Update `mem://index.md` Core line so future sessions know the baseline is flat white, not paper-white #fafaf7. Also update the design line that mentions `--cream` resolving to #fafaf7.

That's it — no component refactors, no new files.