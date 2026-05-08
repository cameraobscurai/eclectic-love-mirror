## Fix

The body paragraph under the headline is capped at `maxWidth: "52ch"`, which is why it stops short of "REALIZED." even though both live in the same `md:col-span-7` column. The headline fills the column; the paragraph doesn't.

**Change in `src/routes/atelier.tsx` (hero section, ~line 227–236):**

Remove the `maxWidth: "52ch"` from the body paragraph so it spans the full col-span-7 column width — matching the headline's right edge.

That's the only change. The grid (`md:col-span-7` for text, `md:col-span-5` for image) already constrains both elements identically.

For "THE HIVE" in `src/components/atelier/team.tsx` — same column setup (`md:col-span-7`) with no max-width cap, so it already aligns. No change needed there.
