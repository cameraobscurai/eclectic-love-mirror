# Mobile fix — Evolution manifesto vertical centering

## Problem
On mobile, the manifesto column uses `items-end ... pb-[2vh]`, pinning the text to the bottom of the available area above the destination cards. Result: big gap above, no gap below.

## Fix (one file: `src/components/home/EvolutionNarrative.tsx`)

1. **Line 246** — drop the mobile-only bottom alignment so the column centers on every breakpoint:
   ```diff
   - <div className="flex-1 min-h-0 flex items-end md:items-center w-full pb-[2vh] md:pb-0 pt-0 md:pt-0">
   + <div className="flex-1 min-h-0 flex items-center w-full">
   ```

2. **Line 291** — tighten the mobile line-size floor so 17 lines + 4 stanza gaps don't clip on short phones (iPhone SE / 13 mini, 568–667pt tall):
   ```diff
   - "clamp(0.95rem, 0.7rem + 0.45vw, 1.25rem)"
   + "clamp(0.85rem, 0.65rem + 0.45vw, 1.25rem)"
   ```

That's it. Desktop schedule untouched (clamp upper bound and all phase math unchanged).

## Verify
Mobile screenshot at 390×844 + 375×667 — confirm equal gap above manifesto and above destination cards, no clipping.
