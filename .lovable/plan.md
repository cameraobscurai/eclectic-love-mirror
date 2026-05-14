Cross-checked our DB against the owner's Squarespace export. Three actual mismatches; rest already match.

| Squarespace (truth) | Our DB | Action |
|---|---|---|
| Eagan Decanter | Eagan Decanter | none |
| Evren 8x10 Kilim Rug | Evren 8x10 Kilim Rug | none |
| Alumina (plates) | Alumina (×4) | none |
| **Dialni** Iridescent Ivory Leather Charger | Dilani 13" Iridescent Ivory Leather Charger | rename Dilani → Dialni |
| **Powel** Dark Brass Tray | Powell 14"/18" Round Dark Brass Tray | rename Powell → Powel (×2) |
| Olive Green Leather **Cahrger** | Olive 13" Leather Charger | rename to "Olive Green 13" Leather Cahrger" |

## Execution

1. SQL update on `inventory_items.title` for the 4 affected rows (rms_ids: 2810, 3170, 3168, 3982).
2. Rebake catalog (`bun scripts/bake-catalog.mjs`) so `current_catalog.json` reflects new titles.

No image, slug, or rms_id changes — titles only. The owner's typos (Powel, Dialni, Cahrger) are preserved intentionally to match their RMS/Squarespace source of truth.

## Open question

"Olive Green Leather Cahrger" — owner's title omits the size. Their other chargers all include it ("Dilani 13"…", "Olive 13"…"). Want me to keep "13"" in our title or strip it to mirror SQ exactly? Default = keep "13"" since size matters for rental decisions.