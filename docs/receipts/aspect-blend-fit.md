# aspectBlend fit against real ink

2026-08-15T21:06:22.182Z · 608 framed rows · min n = 6

`b*` is the blend that flattens rendered INK mass across a category.
Rows below the sample floor are reported but must not be acted on.

| Category | n | primary | current b | slope m | fitted b* | mean inkFill |
| --- | --- | --- | --- | --- | --- | --- |
| pillows | 113 | area | — | 0.052 | n/a | 0.810 |
| accents | 48 | area | — | 0.099 | n/a | 0.550 |
| throws | 39 | area | — | -0.391 | n/a | 0.775 |
| lounge-chairs | 39 | width | 0.65 | 0.410 | 0.59 | 0.534 |
| serveware | 34 | area | — | 0.113 | n/a | 0.666 |
| bars | 33 | height | — | 0.368 | 1.37 | 0.885 |
| side-tables | 31 | width | 0.5 | 0.597 | 0.40 | 0.658 |
| sofas-loveseats | 24 | width | 0.65 | 0.440 | 0.56 | 0.677 |
| coffee-tables | 22 | width | 0.5 | -0.478 | 1.48 | 0.724 |
| dinnerware | 19 | area | — | -0.111 | n/a | 0.743 |
| table-lamps | 18 | height | — | -0.208 | 0.79 | 0.527 |
| rugs | 17 | width | — | 0.078 | 0.92 | 0.703 |
| ottomans | 15 | width | 0.65 | 0.078 | 0.92 | 0.727 |
| dining-tables | 14 | width | 0.5 | -0.329 | 1.33 | 0.363 |
| flatware | 14 | area | — | 0.739 | n/a | 0.413 |
| chandeliers | 13 | height | — | -0.699 | 0.30 | 0.451 |
| storage | 11 | height | — | -0.010 | 0.99 | 0.618 |
| other | 10 | height | — | 0.331 | 1.33 | 0.452 |
| candlelighting | 10 | height | — | -0.158 | 0.84 | 0.616 |
| glassware | 10 | area | — | -0.204 | n/a | 0.539 |
| dining-chairs | 9 | width | 0.65 | 0.796 | 0.20 | 0.490 |
| crates-baskets | 9 | area | — | -0.239 | n/a | 0.665 |
| benches | 9 | width | 0.65 | 0.179 | 0.82 | 0.368 |
| cocktail-tables | 8 | width | 0.5 | -2.172 | 1.50 | 0.619 |
| furs-pelts | 7 | area | — | -0.035 | n/a | 0.707 |
| walls | 7 | height | — | 0.127 | 1.13 | 0.802 |
| community-tables | 6 | width | 0.5 | 1.320 | 0.00 | 0.373 |
| bar-stools | 6 | height | — | 2.456 | 1.50 | 0.395 |
| specialty | 4 | area | — | -0.880 | n/a | 0.651 |
| floor-lamps | 3 | height | — | -2.386 | 0.00 | 0.200 |
| consoles | 3 | width | 0.5 | 0.198 | 0.80 | 0.410 |
| banquettes | 1 | width | 0.65 | — | n/a | 0.806 |
| structures | 1 | height | — | — | n/a | 0.130 |

## Pooled fits (act on these, not the per-category rows)

| Group | n | current b | slope m | ±SE | R² | fitted b* | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| seating | 97 | 0.65 | 0.208 | 0.068 | 0.09 | 0.79 | significant — adopt |
| tables | 84 | 0.5 | -0.089 | 0.090 | 0.01 | 1.09 | not significant — hold |

## Fitted per category (n >= 6) — diagnostic only

```json
{
  "lounge-chairs": 0.59,
  "bars": 1.37,
  "side-tables": 0.4,
  "sofas-loveseats": 0.56,
  "coffee-tables": 1.48,
  "table-lamps": 0.79,
  "rugs": 0.92,
  "ottomans": 0.92,
  "dining-tables": 1.33,
  "chandeliers": 0.3,
  "storage": 0.99,
  "other": 1.33,
  "candlelighting": 0.84,
  "dining-chairs": 0.2,
  "benches": 0.82,
  "cocktail-tables": 1.5,
  "walls": 1.13,
  "community-tables": 0,
  "bar-stools": 1.5
}
```

## Caveats

- `secondaryMax` and `widthMax`/`heightMax` bind before the exponent does on
  extreme aspects, so a refit alone will not move every tile.
- Any change to a blend value changes the recipe and therefore the hash: the
  affected collections need a fresh bake at a new path, never an overwrite (R1).
- Ink is measured on the SOURCE silhouette, so a category shot mostly at an
  angle carries a density bias the regression cannot separate from aspect.
