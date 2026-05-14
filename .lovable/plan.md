# QuickView configuration labels — show the variant suffix

## Problem
In the right-hand Configurations list, rows render as `ANASTASIA ANTIQUE SILVER DINNER …` and truncate the only piece that matters (DINNER FORK / TEA SPOON / SALAD FORK).

Root cause in `src/components/collection/QuickViewModal.tsx` (~L434):
the prefix-strip regex anchors on the full `product.title` ("ANASTASIA ANTIQUE SILVER FLATWARE"). Variant titles don't contain "FLATWARE", so the regex never matches and the label falls back to the full variant title. Combined with `truncate` on the row, the visible text becomes the family prefix + "…".

## Fix (single file, presentation only)
`src/components/collection/QuickViewModal.tsx`

1. Replace the regex with a longest-common-word-prefix strip:
   - Tokenize `product.title` and `v.title` on whitespace.
   - Drop the leading tokens of `v.title` that case-insensitively match the corresponding tokens of `product.title`.
   - Also drop a leading family-category word that's a known synonym (FLATWARE/GLASSWARE/GLASS/CHINA) when the remainder is non-empty — handles "FLATWARE" vs piece names cleanly.
   - Trim trailing " GLASS" / " FLATWARE" as today.
   - Fallback to `v.title` if the result is empty.

2. Keep the row's `truncate` but allow two lines as a safety net:
   - Swap `truncate` → `line-clamp-2 break-words` on the label span (L501 SET row stays single-line; L564 variant row gets `line-clamp-2`).
   - This way even an unusually long suffix (e.g. "BUTTER SPREADER") stays readable.

No data, schema, or catalog changes. No bake step needed.

## Verification
- ANASTASIA: rows should read DINNER FORK, SALAD FORK, STEAK KNIFE, BUTTER SPREADER, DINNER KNIFE, TEA SPOON, etc.
- KIMORA / ALLIRA glassware: rows should read RED WINE, WHITE WINE, COUPE, etc.
- Spot-check a single-word family (e.g. NISHA MATTE BLACK FLATWARE) to confirm fallback still produces a sensible label.
