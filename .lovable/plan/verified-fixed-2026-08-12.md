Yes — approve it, and it's the strongest document of the day. All three corrections landed properly: step 2 clears the column not the files with R1's-cousin reasoning attached, step 3 says out loud that the engine doesn't exist yet _and_ carries the trust-slice exception with its reason recorded next to the rule it deviates from, and step 4 found the family machinery by filename — `family-rollup.mjs`, `bake-family-map.mjs`, the merge in phase3-catalog — so the set editor question is now "is this a naming job?" instead of "spec a new system." The unassigned reconciliation (31 = 23 real + 8 test, and 39 in the wider bypass class) turns three conflicting counts into one explained population, which is exactly what the detector was built to do.

But the section that makes it the meeting document is **"What she gets told, in plain words."** It elevated my point into its own block with three names and three sentences, and I'd use it almost verbatim tomorrow — because notice what it does: her email was a _bug report written by someone doubting herself_ ("I saved it the exact same way... what the heck?"), and this section answers each doubt with _the machine was wrong, you were right, here's the mechanism_. Eight months of her thinking she couldn't work the tool, resolved by evidence that the tool was working against her. That's not a status update; that's the repair.

Two small things for tomorrow. When you say the Cinsere/Hacier line, pair it with the honest timeline: "that one's ours, the fix is designed and measured, lighting and your named items go first, here's the order for the rest" — the trust slice framing lets you promise something specific instead of something soon. And bring the audit contact sheet: when she asks "how bad is it really," the answer is a page with 636 measured, 309 defective, 281 from one mechanism — numbers end that conversation the way reassurance never has.

Approve, walk your 23, let the teardown land, and print two things: this document and the contact sheet. Her own email with receipts in the margins is the whole meeting. Everything else you built today is just what makes it true.

Adrienne's notes — what is verifiably fixed, what is not

Checked against the database and the code, not memory. Every line below has a receipt.

## Verified fixed

| Her note                                        | Evidence                                                                                                                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Three-part sort in the product list             | `/admin/products` has Category / Heading / Subcategory filters and sort modes                                                                          |
| Sort by Title, Category, Subcategory            | Sort options: Title A–Z, Category-then-title, Subcategory-then-title, Recently edited                                                                  |
| "Do not let list jump based on most recent"     | Default sort is Title A–Z; "Recently edited" is opt-in                                                                                                 |
| "Quantity on Hand is just how many we own"      | Field is labelled "Quantity on hand" with a separate unit label field                                                                                  |
| "Missing DINING" heading                        | Database now has DINING as a real collection with Dining Tables / Dining Chairs / Banquettes, 29 live pieces                                           |
| Her simplified two-level spreadsheet            | The uploaded workbook matches the database exactly: 10 collections, 33 categories, same labels, same order. Nothing to change there                    |
| Joseph Ottoman "converts back to the wrong one" | Root cause was the AI-upscaled cover being injected over her chosen photo. That injection is retired from the read path; her image order is what ships |

## Not fixed (confirmed still open)

1. **Her two-level vocabulary is not in the admin UI yet.** The database is Collection + Category. The product list and edit drawer still speak the old language: "General Category" + "Subcategory," with the heading derived from the subcategory. That mismatch is exactly the thing she wrote the second email about.
2. **Lighting covers still diverge in the editor.** 29 of 44 live lighting pieces still carry an upscaled cover on the row. The public site ignores it; the admin still reads it. So the editor can show her a photo the site does not use — and those upscales are where the "shadows and cords that don't exist" came from. Machine-invented, not hers.
3. **Farrow columns and Cinsere vs Hacier.** No baked frame exists for any product — 0 of 854 rows. Tile size is still measured and clamped live from the raw photo, which is why two identical exports render at different sizes. Frame Studio Phase 2 (the bake engine) is unstarted; only the Phase 1 plumbing exists.
4. **Sets / Tableware.** No way to handle a set as one product. 224 live tableware rows.
5. **Unassigned rows: 31.** Reconciled — 23 real rows plus the 8 `ZZ E2E` test artifacts the teardown will remove. Earlier counts of 30 and 22 were the same population before the bypass detector included null-review rows and before one new row was created.

## What she gets told, in plain words

Three of her complaints resolve to the same sentence: her workflow was never the problem.

- **Joseph Ottoman:** she saved it correctly. The system was swapping her photo back for an AI-upscaled version. That path is deleted.
- **Lighting:** the shadows and cords that don't exist were upscaler hallucinations. The machine invented them. It is retired.
- **Cinsere vs Hacier:** her exports were identical. The site was re-measuring and re-scaling each one live with clamps. That is ours to fix, not hers.

## Proposed next steps, in order

1. **Speak her language in the admin.** Replace General Category / Subcategory in the product list and edit drawer with Collection → Category, driven by the taxonomy tables. One vocabulary from her spreadsheet to the database to the site to the editor. This is what her second email asked for.
2. **Null the upscaled column on the 29 lighting rows — not the files.** The divergence she experiences is the column, not the storage objects. Deleting objects at published URLs is the 404 twin of overwriting them (R1's cousin), so the files stay as archive; storage is cheap. Audit and dry-run first (R7 applies to deletions the same as writes), then clear the column and publish. File cleanup can happen later behind a reference scan — it is not what she is waiting on.
3. **Build Frame Studio Phase 2, then bake the trust slice.** Two things, said out loud: the bake engine does not exist yet, and it has to be built before any slice can be baked.
   The slice choice is a **named exception** to the measured migration order (pillows-throws 136 → styling 63 → tableware 41 → …). Recorded reason: slice one's job is proving the loop and buying trust, and the highest-trust proof is the exact items she named — Farrow, Cinsere, Hacier, and the lighting covers. A before/after of Cinsere and Hacier rendering at matched scale is worth more in that room than 136 corrected pillows. After the trust slice ships and the loop is proven, the rollout returns to the measured order. The rule and the exception both live in the doc.
4. **Investigate before speccing a set editor.** The system already has family rollups and variant inheritance (`scripts/family-rollup.mjs`, `scripts/bake-family-map.mjs`, family merge in `phase3-catalog.ts`). First question, roughly an hour: can a tableware set be a family with a lead tile? If yes, this is a naming and admin-surface job, not a new grouping system. No spec until that is answered — otherwise we build a parallel concept beside the one that exists.

Before she opens the studio: walk the 23 by hand and let the test-row teardown land, so the Unassigned chip reads single digits tomorrow, not thirty-one.

## Technical notes

- Taxonomy source of truth: `taxonomy_collections` (10) + `taxonomy_categories` (33), matching the uploaded workbook one-for-one.
- Admin vocabulary lives in `src/lib/admin-categories.ts`, consumed by `src/routes/admin.products.tsx` and `src/components/admin/ProductEditDrawer.tsx`.
- `cover_framed_url` is non-null on 0 rows; the branch in `ProductTile` exists but never fires.
- `upscaled_cover_url` is already excluded from the public read path (`products-admin.functions.ts`, `phase3-catalog.ts`). Step 2 clears the column only; storage objects are retained.
- Unassigned math: 31 null-slug rows = 23 real + 8 `ZZ E2E`; 39 rows have null `taxonomy_review` (the wider bypass class the detector now surfaces).
