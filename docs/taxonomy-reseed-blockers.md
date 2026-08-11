# Reseed blockers — must be ruled before `--apply`

Generated 2026-08-11T20:55:57.013Z.

## Pair mismatches (11)

The category slug exists, but the workbook files it under a different collection
than `taxonomy_categories` declares. One of the two is wrong; ruling either fixes it
(move the category in the reference tables, or correct the workbook column).

| rmsId | title | category | workbookCollection | referenceCollection |
| --- | --- | --- | --- | --- |
| 3468 | ALABASTER VOTIVE | candlelighting | lighting | styling |
| 2613 | AMALIA SMOKE CUT GLASS VOTIVE | candlelighting | lighting | styling |
| 4030 | ENNAI CONCRETE OIL LAMP | candlelighting | lighting | styling |
| 2732 | FLORENCE WEATHERED ZINC LANTERN | candlelighting | lighting | styling |
| 3080 | KINLEE COCOON LUMINARY | candlelighting | lighting | styling |
| 4003 | LACHLAN 36\ BLACK IRON LANTERN | candlelighting | lighting | styling |
| 727 | LAYLA LANTERNS | candlelighting | lighting | styling |
| 3776 | NERA 4\ ALABASTER VOTIVE | candlelighting | lighting | styling |
| 3063 | PIERCE FRENCH ANTIQUE CONSOLE | consoles | dining | lounge-tables |
| 3177 | RUMEN 11\ RED LED CAMPING LANTERN | candlelighting | lighting | styling |
| 1015 | WILHELM 11\ RUSTIC LED CAMPING LANTERN | candlelighting | lighting | styling |

## Off-vocabulary values (0)

Nothing in the reference tables matches these. They abort the apply outright.

_None._
