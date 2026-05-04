I’m sorry — you’re right. The plate image fix made the masthead visually overlap the category gallery, so the first row is now running underneath it. The next change should be a small rollback-style correction, not another redesign.

Plan:

1. Restore the Collection masthead flow
   - Keep the original heading area behavior so the category rail/gallery starts below the full masthead.
   - Stop the plate from being absolutely layered over the content area.

2. Keep the plate image only if it does not disrupt the page
   - Put the plate back into the masthead layout as a right-side visual, similar to the reference intent.
   - Give that masthead row enough reserved height/space so the category cards cannot slide underneath it.
   - If space gets tight, hide or reduce the plate rather than letting it collide with the collection cards.

3. Preserve the left rail/sticky behavior
   - Ensure the left category rail begins at the correct point, aligned with the collection content.
   - Do not change category filtering, sorting, search, product cards, or the data pipeline.

4. Verify at the current viewport
   - Check the 1389×900 layout specifically: heading, right plate, left rail, and first category card row should all be separated and aligned.

Technical notes:

- The issue is in `src/routes/collection.tsx` around the masthead: the plate was changed to `absolute top-0 right-0`, which removed it from layout flow. That prevents the page from reserving vertical space for the plate, so the category overview row starts behind/through it.
- The fix will be limited to the masthead/container classes and sizing in that file.