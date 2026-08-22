# Taxonomy — ghost-ruling rekey manifest

Generated 2026-08-11T21:45:01.061Z by `scripts/rekey-ghost-rulings.mjs` (APPLY).

Root cause: the v4 workbook was keyed on bake-time ids, which are not stable.
Future workbooks key on DB `rms_id`; normalized-title match is the documented fallback.

## Will write (6)

| ghost id                           | db rms_id | title                              | from | to                          | prior source |
| ---------------------------------- | --------- | ---------------------------------- | ---- | --------------------------- | ------------ |
| remy-stainless-steel-vintage-coupe | null      | Remy Stainless Steel Vintage Coupe | ∅/∅  | tableware/serveware         | —            |
| tivoli-travertine-22-plinth        | null      | Tivoli Travertine 22" Plinth       | ∅/∅  | lounge-tables/coffee-tables | —            |
| tivoli-travertine-24-plinth        | null      | Tivoli Travertine 24" Plinth       | ∅/∅  | lounge-tables/coffee-tables | —            |
| tivoli-travertine-32-plinth        | null      | Tivoli Travertine 32" Plinth       | ∅/∅  | lounge-tables/coffee-tables | —            |
| tivoli-travertine-mini-plinth      | null      | Tivoli Travertine Mini Plinth      | ∅/∅  | lounge-tables/coffee-tables | —            |
| tivoli-travertine-small-plinth     | null      | Tivoli Travertine Small Plinth     | ∅/∅  | lounge-tables/coffee-tables | —            |

## Reported, not written (9)

- **MANUAL-176e0cc8** (AVINASH OAK COMMUNITY TABLE) — zero title matches in db
- **aya-16th-century-wooden-doors** (AYA 16TH CENTURY WOODEN DOORS) — db row (rms_id —) is already assigned large-decor/walls — matches the ruling, nothing to recover (review source: none)
- **della-half-frosted-glass-bottle** (DELLA HALF-FROSTED GLASS BOTTLE) — db row (rms_id —) is already assigned styling/accents — matches the ruling, nothing to recover (review source: none)
- **duru-antique-clear-glass-bottle-set** (DURU ANTIQUE CLEAR GLASS BOTTLE SET) — db row (rms_id —) is already assigned styling/accents — matches the ruling, nothing to recover (review source: none)
- **elysanda-ceremony-path-platform** (ELYSANDA CEREMONY PATH + PLATFORM) — 2 title matches — ambiguous [3913, ]
- **libby-glass-hinged-top-box** (LIBBY GLASS HINGED TOP BOX) — db row (rms_id —) is already assigned styling/accents — matches the ruling, nothing to recover (review source: none)
- **lynden-horseshoe-hat-stand** (LYNDEN HORSESHOE HAT STAND) — db row (rms_id —) is already assigned styling/accents — matches the ruling, nothing to recover (review source: none)
- **merritt-post-and-beam-structure** (MERRITT POST AND BEAM STRUCTURE) — db row (rms_id —) is already assigned large-decor/structures — matches the ruling, nothing to recover (review source: none)
- **runa-faux-book-collection** (RUNA FAUX BOOK COLLECTION) — db row (rms_id —) is already assigned styling/accents — matches the ruling, nothing to recover (review source: none)
