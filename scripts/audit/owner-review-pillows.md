# Owner Review — Pillows reconciliation gaps (2026-05-05)

After applying `scripts/audit/pillow-aliases.json` (15 aliases), 114 of 117 live
pillows match a row in the RMS catalog (97.4%). Remaining items below need owner
input — they do **not** block the audit script.

## Live-only (3) — on the live site, missing from RMS export

1. **Brown Yellow Pillow** — `/textiles/brown-yellow-pillow`
   No clear catalog match. Drop from live, or add to RMS?
2. **Ivory Linen Small Lumbar** — `/textiles/ivory-linen-small-lumbar`
   Catalog has "Ivory Linen Pillow" (square) but no lumbar variant. RMS missing the lumbar SKU?
3. **Ivory Sage Stripe Pillow** — `/textiles/ivory-sage-stripe-pillow`
   Catalog has "Ivory Sage Mini Tassel" — likely a different SKU. Confirm.

## Catalog-only (6) — in RMS, no live counterpart

1. **Ivory Sage Mini Tassel** — possibly the same physical pillow as live #3 above (renamed)
2. **Natural Raffia Pillow** — live has only "White Raffia Pillow"; are these the same?
3. **Orange Textile Pillow Dos** — live consolidated 3 SKUs into one card "Orange Brown Textile Pillow"
4. **Orange Textile Pillow Tres** — same as above
5. **Red Slightly Darker Velvet Pillow** — likely a duplicate or shade variant of "Red Velvet Pillow". Retire?
6. **Woven Sand Aztec** — no live counterpart. Retired or never published?
