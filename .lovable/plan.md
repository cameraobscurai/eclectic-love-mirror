# Fix family-cover order overriding the admin

## Confirmed diagnosis

Hudson’s database row is correct: `HUDSON_Render.png` is first in `images[]`, matching the admin.

The public catalog folds Hudson into a family tile. During that merge, `phase3-catalog.ts` classifies the selected cover as a variant image, excludes it from the lead-row cover pass, and makes the next image (`20240803_003751155_iOS.jpg`) the public cover. That is the angled image shown in the screenshot.

## Implementation

1. **Make the admin order authoritative for family leads**
   - When a family’s lead row has live images, preserve that row’s first image as the family cover.
   - Merge baked group shots and member images after it, with filename-level deduplication.
   - Keep existing family aggregation; change only the cover precedence.

2. **Lock the regression**
   - Add a catalog-merge fixture reproducing Hudson’s shape: a lead cover that is also listed as a variant image.
   - Assert the lead row’s `images[0]` remains the public `primaryImage`.
   - Include the cache-version assertion so the recently repaired `updated_at` behavior cannot regress during this edit.

3. **Verify the real product**
   - Load Large Decor after the change and confirm Hudson’s tile uses `HUDSON_Render.png`, not the angled event photo.
   - Confirm its quick view/PDP image order still matches the admin.
   - Check another family tile to ensure merged member photos remain available.

## Scope

No database edit, rebake, or photo replacement. This is a frontend catalog-merge defect.
