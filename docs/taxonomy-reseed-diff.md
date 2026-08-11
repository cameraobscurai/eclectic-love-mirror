# Taxonomy reseed v4 — dry run diff


Generated 2026-08-11T21:11:56.089Z from `taxonomy-remap-v4.xlsx` cross-checked against `products_Aug-11_02-07-41PM.csv`. **Nothing written.**

## Totals

- workbook rows: 635
- blank category (skipped): 0
- off-vocabulary rejects: 0 (any > 0 aborts the apply)
- collection-crossing corrections applied (declared tree wins): 11
- rows to write: 849 (214 inherited by family)
- workbook rms_ids absent from db: 15 — MANUAL-176e0cc8, aya-16th-century-wooden-doors, della-half-frosted-glass-bottle, duru-antique-clear-glass-bottle-set, elysanda-ceremony-path-platform, libby-glass-hinged-top-box, lynden-horseshoe-hat-stand, merritt-post-and-beam-structure, remy-stainless-steel-vintage-coupe, runa-faux-book-collection, tivoli-travertine-22-plinth, tivoli-travertine-24-plinth, tivoli-travertine-32-plinth, tivoli-travertine-mini-plinth, tivoli-travertine-small-plinth
- db rows with an rms_id: 879

## Buckets

| bucket | meaning | count |
| --- | --- | --- |
| 1 | new assignment (db was unassigned) | 0 |
| 2 | changed assignment | 51 |
| 3 | unchanged | 783 |
| 4 | assigned in db, absent from workbook — kept, review-stamped `med`/`v1-seed` | 15 |

## Confidence (from workbook)

| confidence | count |
| --- | --- |
| high | 849 |

## Per-collection counts after reseed

| collection | count |
| --- | --- |
| tableware | 224 |
| textiles | 167 |
| styling | 102 |
| lounge-seating | 86 |
| cocktail-bar | 86 |
| lounge-tables | 59 |
| lighting | 45 |
| large-decor | 30 |
| rugs | 26 |
| dining | 24 |

## Export cross-check (verifier)

- export rows excluded by the Colorado `ut-` rule: 134
- export titles used for matching: 649
- disagreements → demote to `confidence:'med', source:'export-disagreement'`: 1
- `source:'human'` rows are exempt from demotion.

| rmsId | title | proposed | export |
| --- | --- | --- | --- |
| 712 | KEATON ANTIQUE FLOOR MIRROR | walls | Accents |

## Bucket 2 — changed assignments

| rmsId | title | wasC | wasK | collection_slug | category_slug |
| --- | --- | --- | --- | --- | --- |
| 3190 | AUSET LINEN BANQUETTE | dining | banquettes | dining | dining-chairs |
| 3106 | BARTOLO BLACK TAMBOUR COLUMNS | lounge-tables | side-tables | cocktail-bar | cocktail-tables |
| 3107 | BARTOLO 42\ BLACK TAMBOUR COCKTAIL COLUMN | cocktail-bar | bars | cocktail-bar | cocktail-tables |
| 3105 | BARTOLO 32" BLACK TAMBOUR COCKTAIL COLUMN | lounge-tables | side-tables | cocktail-bar | cocktail-tables |
| 376 | BROADWAY CONCRETE COUNTER COMMUNITY TABLE | cocktail-bar | bars | cocktail-bar | community-tables |
| 2240 | BROWN VELVET QUILTED PILLOW | textiles | throws | textiles | pillows |
| 2255 | CHAMPAGNE VELVET QUILTED PILLOW | textiles | throws | textiles | pillows |
| 3491 | CHRISHELL GLOBE LAMP | lighting | specialty | lighting | table-lamps |
| 4001 | CULETTA GREEN MARBLE CABARET LAMP | lighting | specialty | lighting | table-lamps |
| 2155 | DELILAH GOLD METAL SCREEN | large-decor | other | large-decor | walls |
| 2992 | DUKE ANTIQUE BRONZE COCKTAIL TABLE | cocktail-bar | bars | cocktail-bar | cocktail-tables |
| 819 | FARRAH TRIPLE GOLD GLOBE LAMP | lighting | specialty | lighting | table-lamps |
| 2762 | FARROW COCKTAIL COLUMN TABLES | lounge-tables | side-tables | cocktail-bar | cocktail-tables |
| 2764 | FARROW 43" CEDAR COCKTAIL COLUMN | lounge-tables | side-tables | cocktail-bar | cocktail-tables |
| 2763 | FARROW 38" CEDAR COCKTAIL COLUMN | lounge-tables | side-tables | cocktail-bar | cocktail-tables |
| 2761 | FARROW 29" CEDAR COCKTAIL COLUMN | lounge-tables | side-tables | cocktail-bar | cocktail-tables |
| 2441 | FUR IVORY MONGOLIAN THROW | textiles | throws | textiles | furs-pelts |
| 3535 | GIESEL GREEN FRINGE LAMP | lighting | specialty | lighting | table-lamps |
| 3534 | GREER LOW GOLD BOWL | tableware | serveware | tableware | dinnerware |
| 3768 | HAZEL CHARRED TERRACOTTA BOWL | tableware | serveware | tableware | dinnerware |
| 3769 | HAZEL LARGE CHARRED TERRACOTTA BOWL | tableware | serveware | tableware | dinnerware |
| 3321 | IRENE BRASS CABARET LAMP | lighting | specialty | lighting | table-lamps |
| 3574 | JANA MATTE BRONZE CABARET LAMP | lighting | specialty | lighting | table-lamps |
| 1857 | JETT BRASS & WOOD COMMUNITY TABLE | cocktail-bar | bars | cocktail-bar | community-tables |
| 3508 | JETT MINI BRASS & WOOD COMMUNITY TABLE | cocktail-bar | bars | cocktail-bar | community-tables |
| 2754 | JUNO CLEAR GLASS LAMP | lighting | specialty | lighting | table-lamps |
| 712 | KEATON ANTIQUE FLOOR MIRROR | large-decor | other | large-decor | walls |
| 358 | NA'EEM WOOD DINING  TABLE | lounge-tables | side-tables | dining | dining-tables |
| 733 | NANETTE MARBLE BISTRO SIDE TABLE | cocktail-bar | cocktail-tables | lounge-tables | side-tables |
| 1940 | NANTUCKET 41\ OAK WOOD COLUMN | cocktail-bar | bars | cocktail-bar | cocktail-tables |
| 3966 | NIMA FABRIC BANQUETTE | dining | banquettes | dining | dining-chairs |
| 3972 | NIMA FABRIC BANQUETTE - SINGLE W/ WALNUT WOOD BACKBOARD | dining | banquettes | dining | dining-chairs |
| 3967 | NIMA FABRIC BANQUETTE - DOUBLE | dining | banquettes | dining | dining-chairs |
| 3973 | NIMA FABRIC BANQUETTE - DOUBLE W/ WALNUT BACKBOARD | dining | banquettes | dining | dining-chairs |
| 880 | NIXON GLOBE LAMP | lighting | specialty | lighting | table-lamps |
| 2304 | ORANGE VELVET QUILTED PILLOW | textiles | throws | textiles | pillows |
| 3895 | OXFORD FOSSIL PLINTH | styling | accents | cocktail-bar | bars |
| 3894 | OXFORD FOSSIL 26" PLINTH | styling | accents | cocktail-bar | bars |
| 3893 | OXFORD FOSSIL 20" PLINTH | styling | accents | cocktail-bar | bars |
| 4097 | RELIC LIMESTONE COLUMN | cocktail-bar | bars | cocktail-bar | cocktail-tables |
| 4037 | RODRICK BRASS CABARET LAMP | lighting | specialty | lighting | table-lamps |
| 4014 | ROSALIND CREAM VELVET ROUND BANQUETTE | dining | banquettes | lounge-seating | sofas-loveseats |
| live-ruby-red-ski-lift-bench | RUBY RED SKI LIFT BENCH | large-decor | other | lounge-seating | benches |
| 360 | SCOUT WOOD COMMUNITY TABLE | cocktail-bar | bars | cocktail-bar | community-tables |
| 362 | TIMON WOOD COCKTAIL TABLE | cocktail-bar | bars | cocktail-bar | cocktail-tables |
| 3187 | TOSHIA MIRROR COLUMN | lounge-tables | side-tables | cocktail-bar | cocktail-tables |
| 3188 | TOSHIA 40\ MIRROR COCKTAIL COLUMN | cocktail-bar | bars | cocktail-bar | cocktail-tables |
| 3186 | TOSHIA 24" MIRROR COCKTAIL COLUMN | lounge-tables | side-tables | cocktail-bar | cocktail-tables |
| 2967 | VERNA CLASSIC WOOD PICNIC BOX | styling | accents | styling | crates-baskets |
| 2154 | WARREN METAL CANOPY | large-decor | other | large-decor | structures |
| 2902 | WOVEN SAND AZTEC | textiles | pillows | textiles | throws |

## Bucket 1 — new assignments

_None._
