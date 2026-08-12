# Adrienne's notes — what is verifiably fixed, what is not

Checked against the database and the code, not memory. Every line below has a receipt.

## Verified fixed

| Her note | Evidence |
| --- | --- |
| Three-part sort in the product list | `/admin/products` has Category / Heading / Subcategory filters and sort modes |
| Sort by Title, Category, Subcategory | Sort options: Title A–Z, Category-then-title, Subcategory-then-title, Recently edited |
| "Do not let list jump based on most recent" | Default sort is Title A–Z; "Recently edited" is opt-in |
| "Quantity on Hand is just how many we own" | Field is labelled "Quantity on hand" with a separate unit label field |
| "Missing DINING" heading | Database now has DINING as a real collection with Dining Tables / Dining Chairs / Banquettes, 29 live pieces |
| Her simplified two-level spreadsheet | The uploaded workbook matches the database exactly: 10 collections, 33 categories, same labels, same order. Nothing to change there |
| Joseph Ottoman "converts back to the wrong one" | Root cause was the AI-upscaled cover being injected over her chosen photo. That injection is retired from the read path; her image order is what ships |

## Not fixed (confirmed still open)

1. **Her two-level vocabulary is not in the admin UI yet.** The database is Collection + Category. The product list and edit drawer still speak the old language: "General Category" + "Subcategory," with the heading derived from the subcategory. That mismatch is exactly the thing she wrote the second email about.
2. **Lighting images still reverting.** 29 of 44 live lighting pieces still carry an upscaled cover file. The public read path ignores it, but the admin still shows/keeps it, so what she sees in the editor and what she expects can diverge. The stored files themselves have not been cleaned up.
3. **Farrow columns and Cinsere vs Hacier.** No baked frame exists for any product — 0 of 854 have a framed derivative. Tile size is still computed live from the raw photo, which is why two photos she exported identically render differently. This is the Frame Studio work, still unstarted past the plumbing.
4. **Sets / Tableware.** There is still no way for her to manipulate a set as one product. 224 live tableware rows, no set editor.
5. **31 unassigned rows** have no collection or category. Out of navigation until walked by hand.

## Proposed next steps, in order

1. **Speak her language in the admin.** Replace the General Category / Subcategory pair in the product list and edit drawer with Collection → Category, driven by the taxonomy tables. One vocabulary everywhere: her spreadsheet, the database, the site, the editor.
2. **Clean the lighting covers.** Drop the retired upscaled files for the 29 lighting rows so the editor and the site show the same photo, then publish.
3. **Frame Studio bake, first slice.** Produce baked frames for one collection — lighting or cocktail tables — and prove Farrow/Cinsere render at matched scale before rolling wider.
4. **Set editor** for tableware, once 1–3 are done.

## Technical notes

- Taxonomy source of truth: `taxonomy_collections` (10) + `taxonomy_categories` (33), matching the uploaded workbook one-for-one.
- Admin vocabulary lives in `src/lib/admin-categories.ts`, consumed by `src/routes/admin.products.tsx` and `src/components/admin/ProductEditDrawer.tsx`.
- `cover_framed_url` is non-null on 0 rows; the branch in `ProductTile` exists but never fires.
- `upscaled_cover_url` is already excluded from the public read path (`products-admin.functions.ts`, `phase3-catalog.ts`); the remaining fix is removing the stored files.
