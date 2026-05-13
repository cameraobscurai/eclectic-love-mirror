## Ship now

### 1. Fix Voyage Black Bar visibility (bug from yesterday's Navy removal)
Flip `publicReady: true` for id 2911 in `src/data/inventory/current_catalog.json`. DB already correct; only the baked file is stale.

### 2. ALL CAPS for product names site-wide
Add `text-transform: uppercase` to product-name renders across:
- Collection grid tiles
- Product detail page title
- Cart / inquiry snapshots
- Carousel labels
- Search results
Update memory: product names now follow the ALL CAPS site rule (drop the mixed-case exception).

### 3. Anathema console → Lounge Tables (consoles in one place)
Re-tag `inventory_items.category` from `storage` → `tables` for rms_id 3983 so the routing override finally lands it in Lounge Tables. Re-bake catalog.

### 4. Vespa Antique Mirror → variant of Vespa Shelf
Hide `live-vespa-shelf-antique-mirror-back` as standalone, attach as a variant of Vespa Dark Wood Shelf (rms_id 1929). Re-bake.

### 5. Sanara Dining Chair fixes
- Update Taupe Velvet (rms_id 4133) width → 19"W
- Show both Brown Tweed + Taupe Velvet thumbnails in the main grid tile (dual-image swatch on the card, like other multi-color products)

### Skip for now (need design/UX pass, not a one-line fix)
- "Show Scale" toggle on Tableware not syncing with image cycle — needs investigation in viewer state
- Carousel image-naming for variant sets (Vintage Silver Goblets etc.) — needs label model on per-image metadata
- Bleed-off-page scrolling — needs reproduction first

I'll flag these back to you with a separate plan once the above ships.

---

**Order of operations:** 1 → 3 → 4 → 5 → 2 (caps last so I can verify everything else against current text first).