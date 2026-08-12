# Mobile typography audit — verdict and fixes

## Verdict on the home header

The mobile home header **is** using the approved typeface. The weight structure is not.

Saol Display ships three faces in this project: **400 upright, 600 upright, 300 italic**. There is no 300 upright cut.

| Element | Asks for | Actually renders |
|---|---|---|
| Mobile hero wordmark | Saol 300 upright | Saol 400 (browser rounds up) |
| Desktop hero H1 | Saol 600 | Saol 600 |
| Mobile tagline | Inter 400 uppercase | Inter 400 |
| Desktop tagline | Saol 400 italic | Saol 300 italic |

Two real inconsistencies:
1. **Mobile and desktop taglines are different typefaces** — Inter on mobile, Saol italic on desktop. Same line of copy, same page.
2. **`font-weight: 300` upright is used site-wide** (mobile wordmark, nav, mobile menu, `.page-title`, `.footer-wordmark`) for a weight that does not exist. It silently resolves to 400, so the intent is a lie in the code even though the pixels are fine.

One dead font reference: CSS in eight files asks for `"Cormorant Garamond"`, but the stylesheet link loads `Cormorant`. Those elements render Georgia.

## What to change

### 1. Unify the hero tagline
Make the mobile tagline match the desktop lockup: Saol Display italic, mixed case, not uppercase Inter. Keep mobile's smaller clamp and the frosted band.

### 2. Retire phantom weight 300
Replace every upright `font-weight: 300` / `font-light` on Saol with `400`, and note the available faces in a comment next to the `@font-face` block. Purely declarative — no visual change, it just stops the code claiming a weight that doesn't exist.

Touches: `src/routes/index.tsx` (mobile wordmark), `src/components/navigation.tsx` (4 spots), `src/styles.css` (`.page-title`, `.footer-wordmark`).

### 3. Fix the Cormorant reference
Either add `Cormorant Garamond` to the Google Fonts link or rename the CSS references to `Cormorant`. Renaming is cheaper and adds no network weight.

## Not touching
- Desktop H1 at 600 — that's the intended display weight, verified against the approved lockup.
- Inter for body/labels — correct per the brand register.
- ALL CAPS rule — unchanged everywhere except the hero tagline, which follows the desktop treatment.

## Technical notes
- Faces declared in `src/styles.css` lines 15–35; tokens `--font-sans` / `--font-display` at 41–45.
- Italic requests match the 300 italic face regardless of the weight asked for, which is why the desktop tagline already looks right.
- Verify after: screenshot `/` at 440px and 1440px, confirm the two taglines read as the same typeface.
