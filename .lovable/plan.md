## What's actually happening in row 2

Two unrelated problems compounding into one ugly experience:

### 1. Every tile is downloading a 2500-pixel-wide image

The catalog JSON points every product image at the Squarespace CDN with `?format=2500w` baked in. Example:

```
.../Adagio+Disco+Ball.png?format=2500w
```

A grid tile renders at ~200–260 CSS px. We're shipping ~50× more pixels than the tile can show — for **all 60 tiles in the first batch**. That's why the page feels slow: bandwidth is saturated downloading huge originals, and the network queue chokes on tiles past row 1.

### 2. The blur-up placeholder makes row 2 look broken

`ProductTile` has two visual paths:

- Tiles **0–5** (row 1 on a 6-col grid) — `skipBlur=true`. Image paints crisp from first byte.
- Tiles **6+** — start at `filter: blur(14px); opacity: 0.55` and only clear once `onLoad` fires.

So while row 1's huge images stream in (priority=high), row 2's huge images are still downloading — and the user stares at a wall of heavy gray-blurred rectangles. That's the "blurred row" in your screenshot. It's not a bug per se, it's the placeholder waiting for slow images.

## Fix

### A. Serve right-sized images

Add a small helper that rewrites Squarespace `?format=NNNw` to a tile-appropriate width based on the tile's role:

| Use | Width param |
|---|---|
| Grid tile (comfortable + dense) | `?format=750w` |
| QuickView main stage | `?format=1500w` |
| QuickView thumbnails | `?format=300w` |
| Inquiry tray thumb | `?format=300w` |

Helper: `src/lib/image-url.ts` exports `withCdnWidth(url, width)`. It only touches Squarespace CDN URLs (regex on `images.squarespace-cdn.com` + `format=\d+w`); anything else passes through untouched. Safe for future Supabase storage URLs — they just bypass the transform.

Update call sites:
- `ProductTile.tsx` — wrap `product.primaryImage.url` with `withCdnWidth(url, 750)`. Also add a real `srcSet`/`sizes` so retina + dense layouts pull a larger variant when needed (`750w` + `1100w`).
- `QuickViewModal.tsx` — wrap stage image at `1500w`, thumbnails at `300w`.
- `InquiryTray.tsx` — wrap thumbs at `300w` if it renders any.

This alone should drop initial grid weight by ~10×.

### B. Kill the heavy blur, keep a quiet placeholder

The 14px blur + 0.55 opacity reads as "broken" the moment more than 6 tiles are in flight. Replace it with a quiet cream-tinted block that simply fades out on load. Same skeleton role, no scary blur of a low-res ghost (we never had a low-res ghost — it's just blurring nothing).

In `ProductTile.tsx`:

- Drop the `filter: blur(14px)` branch entirely. Image renders with `opacity: 0` initially, transitions to `opacity: 1` over 240ms on `onLoad`.
- Skeleton overlay stays as a flat `bg-cream` block, fades out on the same 240ms.
- `skipBlur` boolean becomes obsolete — remove it. Priority tiles and lazy tiles use the exact same fade. Consistent across all rows.

Result: row 2 looks like clean cream rectangles for the brief moment it takes images to arrive, then fades to crisp images. No scary blur wall.

### C. Raise the priority window slightly

`HIGH_FETCH_COUNT = 6` matches a 6-col grid but on the 1303px viewport you're using, the user sees tiles 0–5 in row 1 and 6–11 in row 2 above the fold. Bump `HIGH_FETCH_COUNT = 12` so both visible rows get `fetchpriority="high"`. `EAGER_LOAD_COUNT` stays at 12.

This is safe now because each "high" image is ~50× smaller after fix A.

## Files

- `src/lib/image-url.ts` — new (~20 lines)
- `src/components/collection/ProductTile.tsx` — use `withCdnWidth`, drop blur-up, simplify load state, raise priority window
- `src/components/collection/QuickViewModal.tsx` — use `withCdnWidth` for stage + thumbs
- `src/components/collection/InquiryTray.tsx` — use `withCdnWidth` for thumbs (if applicable)

## Out of scope

- Migrating images out of Squarespace CDN onto Supabase storage. That's an inventory/data task; not what's slowing the page today.
- Changing the grid density or column counts.
- Skeleton shimmer animation. Stays a quiet flat fade — the "Aesence editorial restraint" register.

## What you'll see after

- First paint of the grid arrives in roughly a tenth of the bytes.
- Row 2 doesn't go through the heavy blurred-rectangle phase — it just appears as clean cream slots that fade to images within 1–2 seconds on a normal connection.
- No visual difference between the priority and lazy tiles in their loading state.
