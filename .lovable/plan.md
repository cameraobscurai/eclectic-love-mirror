## Scope

14 families have a Set photo at `squarespace-mirror/_family-sets/{FAM}/{FAM}+Set.png` but variants don't have it as image[0]. Total: **47 variants** to update.

| Family | Variants needing Set |
|---|---|
| AKOYA | 4 |
| ALUMINA | 4 |
| BELISSA | 3 |
| EDEN | 4 |
| FIONA | 1 |
| HONEY | 1 |
| JAIN | 4 |
| KIMORA | 2 |
| LAPIS | 3 |
| LAVANYA | 3 |
| MIDORI | 3 |
| POWEL | 2 |
| SAGE | 4 |
| SHETANI | 2 |
| TABITHA | 4 |
| TILLERY | 3 |

(All matched rows verified — only legit family variants in tableware/serveware, no false positives like pillows or seating.)

## Approach

Same pattern as Lapis bowl fix:

1. For each variant where `images[0]` is not already the family Set URL, prepend `https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/squarespace-mirror/_family-sets/{FAM}/{FAM}%2BSet.png` and dedupe.
2. Run as a single SQL migration scoped to the 47 specific rows (matched by `UPPER(split_part(title,' ',1)) = fam` AND status<>'draft').
3. Re-bake catalog: `node scripts/bake-catalog.mjs`.
4. Restart dev server.

## Safeguards

- Only touches rows whose first title token matches an existing `_family-sets/{FAM}/` folder.
- Skips rows already showing the Set as image[0].
- Preserves existing piece photos in order behind the Set.
- No deletes, no schema changes.

## Out of scope

- Families without a `_family-sets/` folder (e.g., HERROD, QUINN, ANASTASIA, WINSLOW). Those need a Set photo mirrored first — separate task.
- Furniture/lighting categories — Set hero pattern is tableware/serveware only.