## Goal

Keep the H aside fully cropped (no letterboxing) and stop the chair / "the HIVE" lockup from clipping horizontally. Let the image clip top/bottom instead — that's where the artwork has padding.

## Single change

In `src/routes/collection.tsx` (the `motion.aside` ~lines 958–1000):

- **Keep** `object-cover` on the `<img>` (no contain-mode, no letterbox).
- **Keep** the existing aside width clamp `clamp(44%, 36% + 8vw, 52%)` (grid layout untouched).
- **Switch the fit strategy** so the image fills width-first instead of cover's default "fill the larger axis":
  - Set `width: 100%; height: auto; min-height: 100%` on the `<img>` and keep `object-cover` so any overflow is bled off the top/bottom equally.
  - Or, equivalently (cleaner): keep `w-full h-full object-cover` and pin `objectPosition: "center 50%"` — but force horizontal fullness by using a wrapper with `overflow-hidden` + the image sized to `min-width: 100%; min-height: 100%; width: auto; height: auto;` (classic cover-by-width pattern).
  - Net effect at every desktop width: full horizontal extent of the artwork is visible (chair + lockup never cropped left/right); any extra image height bleeds above/below into the negative space.

## Verification

- Resize preview at 1024 / 1209 / 1366 / 1440 / 1600 / 1920.
- Check at every step: full "the HIVE" wordmark and chair visible left↔right; vertical clip lands in the empty space above/below the mark; aside is flush (no white bands); right-side grid layout unchanged.
- Mobile/tablet untouched (aside is `hidden lg:flex`).

## Out of scope

- No new assets, no width-cap, no contain-mode, no grid changes.
