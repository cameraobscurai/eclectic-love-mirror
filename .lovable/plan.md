# No-image variants → blank thumb + non-clickable

## Change (single file, presentation only)
`src/components/collection/QuickViewModal.tsx` ~L529–595

For each variant row where `hasOwnImage === false`:
- Render the 40×40 thumb chip empty (no `<img>`, no family-hero fallback). Keep the bordered white square so the row layout doesn't shift.
- Disable the `<button>`: add `disabled`, `aria-disabled="true"`, `tabIndex={-1}`, swap hover classes for `cursor-default opacity-60`, and skip the `selectVariant(v.id)` onClick.
- Keep the qty pill + label visible so the owner still sees what's missing.

Also tweak the main image area: when the user lands on a variant with no own image (e.g. via the SET row's deep-link), show the family hero as today — only the row chip itself goes blank. No catalog/data changes.

## Logic preserved
- `rows`, `chipImg`, `hasOwnImage` already exist; just branch on `hasOwnImage`.
- SET row stays clickable (it always has the family hero).
- Keyboard nav still works — disabled rows are skipped naturally.

## Verify
- PINK QUARTZ TEA SPOON row: blank thumb, greyed text, not clickable.
- Other PINK QUARTZ pieces with photos: unchanged.
- ANASTASIA / KIMORA / SHETANI: rows that already have photos unchanged.
