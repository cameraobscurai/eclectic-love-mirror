# Triage of WEBSITE_NOTES-5 + Tableware_Notes-4

Notes are nearly identical to v3. Cross-referenced against current catalog state.

## ✅ Already shipped (no action — needs republish to go live)

**Cross-cutting (Tableware page 1):**
- All-caps inventory names — site-wide
- Scroll affordance for bleeding images — "MORE →" + counter in QuickView
- "Show Scale" syncs with active image — `matchVariant()` fix
- Variant titling swaps per image — clickable variant list

**WEBSITE_NOTES REMOVE block (all hidden):**
- Gwenevere, Pierre, Voyage Bar Trunk, Paxton (×3), Ivory Linen pillows (×2)
- GAMES heading removed from Styling

**WEBSITE_NOTES GENERAL:**
- Consoles consolidated to Lounge Tables (Anathema + Pierce moved)
- Vespa + Mirror collapsed into Vespa shelf variant
- Sanara dim → 19"W
- Raden dim → 53×35×15

**Tableware altText regen:** Akoya, Midori, Tillery, Jain, Anastasia, Astrid, Donaver, Estella, Quinn, Winslow, Honey, Thistle, Allira, Belissa, Lavanya — per-variant alts wired

→ **Action: republish.** This alone clears roughly 70% of the spec's complaints.

---

## 🟢 Fixable now in code (Bucket B from v3 — still pending)

Pure data passes on `current_catalog.json`. No owner input needed.

1. **LARIQUE** — dedupe `.png`/`.PNG` collisions (10 → 5 images)
2. **TABITHA** — drop generic `image-asset.png` from [0]
3. **SHETANI** — drop stray `SHETANI_Set.png` duplicate
4. **HAZEL** — reorder: set first, then Small, Large
5. **EVITA** — collapse to single SKU (Orla/Dilani/Olive model)
6. **SAGE Glassware** — drop duplicate `SAGE Set 1.png`
7. **OPHIDIA** — omit blank image (new in v5, easy filter)
8. **BELISSA** — drop blank + foreign-product image (new in v5)
9. **Farren, Wells, Alexander** — drop double set image (verify; may already be done)

→ **9 items, ~30 min, one dry-run + apply pass.**

---

## 🔴 Blocked on owner — cannot fix without assets

**New products (need photos + final dims):**
Ives, Ivan, Niva, Dunstan, Maximus, Vanna, Boone, Ovalia, Kai

**Image replacements (owner sending):**
Raden (new photo), Flint (re-color), Inola (match Iraja), Canyon Bar (rotate), Bartolo/Farrow/Toshia (set shots), Sanara (two-color thumbnail decision)

**Tableware singles missing:**
- Flatware: Fiona, Deja, Midas, Alta, Nisha, Heston, Arian, Millie
- Glassware: Carlisle, Adonis, Sage extras, Narin extras
- Dishes: Tillery largest plate, Lavanya smallest plate
- Trays: Callum large

**Rugs (13 missing entirely):** Webb, Trinidad, Shiraz, Sheridan, Leyan, Larkin, Keitha, Harlow, Feride, Felina, Evern, Dayna, Briar, Atlas
**Rugs (3 missing perspective):** Shima, Shiloh, Obsidian
**Hides:** All 25 missing both images

**Spelling/ID clarification:**
- ALMINA — no match (ALLIRA?)
- POWELL vs live "Powel"
- EAGEN — confirm spelling
- EVERN rug — confirm spelling/RMS ID

---

## Score

| Bucket | Count | Fixable now? |
|---|---|---|
| Already shipped | ~25 line items | Republish only |
| Pure data fixes | 9 line items | Yes — this pass |
| Owner-blocked | ~70 line items (rugs/hides dominate) | No |

**This pass executes Bucket B (9 fixes) + republish.** Owner-blocked items stay on the request sheet at `/mnt/documents/website-notes-owner-requests.md` (will refresh with v5 deltas).

## Technical scope

- Single edit to `src/data/inventory/current_catalog.json`
- Helper script in `scripts-tmp/` for dedupe/reorder dry-run → apply
- Refresh owner-request markdown with v5 additions (Ophidia, Belissa specifics, Evern rug)
- No component, schema, or routing changes