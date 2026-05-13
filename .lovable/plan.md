## Goal

Act on the inventory specialist's PDF notes. Two tracks: **(A) site-wide UX issues that affect every product** and **(B) per-product data fixes scoped to Tableware** (Dish, Flatware, Glassware, Serveware).

---

## A. Cross-cutting issues (affect the whole Collection)

### A1. ALL CAPS for product names
Catalog titles ("Akoya", "Belissa") render mixed-case. The standing rule kept catalog names mixed-case as the one exception to the all-caps voice. Owner now wants caps everywhere.

Fix: apply `text-transform: uppercase` (with appropriate tracking) to product titles in `ProductTile`, `QuickViewModal` H2, variants list, and inquiry tray. Pure presentation — no data changes. Update the Typography memory to drop the catalog-name exception.

### A2. Image carousel scroll affordance ("how do you scroll to see images that bleed off the page?")
The QuickView thumbs row scrolls horizontally with a subtle right-edge fade mask, no visible cue. Mouse users don't realize they can scroll.

Fix: add visible prev/next arrow chips (desktop) over the thumbs strip when content overflows, plus arrow-key paging through `imgIdx`. Keep touch swipe as-is.

### A3. "Show Scale" doesn't follow the current image
Scale rule reads from `product.dimensions` (the family-level dimension). When the user pages through variant images (Akoya: 7", 9.5", 11", 13.5"), the rule stays pinned to one number.

Fix: when the product has variants AND there's a 1:1 mapping between non-set images and variants, drive the scale rule from the *current image's* matched variant dimension. Fallback to product.dimensions when no match.

### A4. Per-image variant labeling
On family listings (Akoya, Belissa, Vintage Silver Goblets, etc.) the title stays "Akoya" no matter which image is shown, and the variants list isn't clickable.

Fix: 
- When viewing image N that maps to a variant, show the variant's full name as a sub-line under the H2 ("Akoya 7" Plate").
- Make each variant row in the Stocked Quantity list clickable — clicking jumps `imgIdx` to that variant's image.
- Mapping rule: position 0 = family/set image (no variant label). Positions 1..N map to `variants[i-1]` if counts match. If counts mismatch, use filename heuristic on `inferredFilename`/url (`AKOYA 7.png` → 7" variant). If still ambiguous, leave unlabeled.

---

## B. Per-product data cleanup (Tableware)

All data fixes live in `src/data/inventory/current_catalog.json`. Pattern of bugs found:

1. **"Double set image"** — products got both `inventory/TABLEWEAR/<NAME> Set.png` AND `squarespace-mirror/_family-sets/<NAME>/<NAME>+Set.png` appended. Visible because both have `position: 0, isHero: true`. Fix: drop the `_family-sets` duplicate.
2. **Blank / wrong-product images** — Belissa carries a blank squarespace file plus an actual Evita marble charger image. Same blank file appears in others. Fix: remove unmatched squarespace stragglers from the listed products.
3. **Wrong altText on every image** — every variant image inherits the family altText ("Belissa 13″ White Charger Plate" on the 8.5″ photo, etc.). Fix: derive altText per image from filename → variant title.

### B1. Dishes
| Product | Action |
|---|---|
| ALMINA | Remove duplicate set image |
| BELISSA | Remove blank image + wrong (Evita) image + duplicate set image |
| AKOYA | Remove duplicate set image (last entry) |
| JAIN | Remove duplicate set image |
| MIDORI | Remove duplicate set image |
| OPHIDIA | Remove blank image |
| TILLERY | Remove duplicate set image; **owner: missing largest plate** → uploads needed |
| LAVANYA | **owner: missing smallest plate** → upload needed |
| EVITA | Restructure as a single SKU with one image, matching the Orla/Olive/Dilani pattern (drop the two squarespace strays already noted) |

### B2. Flatware
| Product | Action |
|---|---|
| ANASTASIA, ASTRID, DONAVER, ESTELLA, QUINN, WINSLOW | Remove duplicate set image; **missing single-piece images** → uploads needed |
| FIONA, DEJA, MIDAS, ALTA | **missing single-piece images** → uploads needed |
| NISHA, HESTON, ARIAN, MILLIE | **no images at all** → uploads needed |

### B3. Glassware
| Product | Action |
|---|---|
| BRONSON, LARIQUE, HONEY, THISTLE, ALLIRA | Remove duplicate set image |
| SAGE, NARIN | Remove duplicate set image; **missing singles** → uploads needed |
| CARLISLE, ADONIS | **no images at all** → uploads needed |

### B4. Serveware
| Product | Action |
|---|---|
| TABITHA, SHETANI, POWELL, HAZEL | Curate down — too many images (target: set + each variant once) |
| FARREN, WELLS, EAGEN, ALEXANDER | Remove duplicate set image |
| CALLUM | **missing large tray** → upload needed |
| LAVANYA BOWL | Remove the stray Dishes image; curate remaining count down |

---

## Execution order

1. **Confirm scope with owner** (one question, below) before touching variant↔image mapping logic.
2. Cross-cutting UX (A1–A4) shipped as a single pass — all live in `ProductTile.tsx`, `QuickViewModal.tsx`, `InquiryTray.tsx`, plus a memory update.
3. Data cleanup (B1–B4) as a single edit pass on `current_catalog.json` covering every "remove duplicate / blank / wrong" item. Per-image altText regenerated from variant titles.
4. Produce a **short missing-images report** listing every product still needing an upload from the owner (everything bolded above), so the inquiry list goes back to the specialist as one document.
5. Owner uploads missing images → second pass binds them.

## Open question

Per-image variant labeling (A4) needs a decision: when image count and variant count don't match (very common — set image + N singles vs. N variants), should I (a) use filename-pattern matching (`AKOYA 7.png` → 7″ variant) wherever it works and leave the rest unlabeled, or (b) treat this as "needs owner remap" and ship the clickable variants list without the per-image title until owner confirms each mapping? Plan as drafted assumes (a).

## Out of scope (cannot do without owner uploads)

Anything tagged "missing", "no images", or "needs upload" above. The edit pass will surface these in a single CSV/MD report rather than guessing.
