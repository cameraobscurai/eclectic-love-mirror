## What's broken today

1. **Step 2 "Browse The Collection"** uses `StudioBrowser` / `CatalogPickerTab` — a flat 2-col grid of ~60 random product thumbs with a search box. It does not mirror the signature `/collection` experience (the 15-tile `CategoryTonalGrid` you screenshotted → click → subcategory rail → products).
2. **Finish step asks for name/email a second time.** Reason to verify: state lives in `useState` inside `stylebrief.index.tsx`. If the submit handler navigates to `/stylebrief/thanks` and the user hits Back, or if a re-render unmounts the form section between Step 2 and Step 4, the inputs blank out. Need to confirm exact trigger before fixing.

## Plan

### Part A — Mirror the Collection process inside Step 2

Replace `<StudioBrowser />` in `stylebrief.index.tsx` Step 2 with a new `<CollectionPicker />` component that reuses the *same* visual + interaction language as `/collection`:

- **Level 1 — Category grid.** Reuse `CategoryTonalGrid` (the 15-tile checker grid: Sofas, Chairs, Benches & Ottomans, Cocktail Tables, Side Tables, Coffee Tables, Dining, Bar, Lighting, Storage, Pillows, Throws, Tableware, Styling, Rugs). Same greyscale checker tones, same hero image per tile, same caps labels.
- **Level 2 — Subcategory / product rail.** On tile click, drill into the category using the same subcategory chips + product grid that `/collection` and `collection_.$slug.tsx` use. Pin/unpin badge (the existing `+` / `✓` corner badge) replaces the "View" action — clicking a product pins it instead of navigating.
- **Level 3 — Back to grid.** Breadcrumb / back link returns to the 15-tile grid. Pinned count chip sticks to the top of the picker so users always see what they've pinned.
- Search stays available as a secondary affordance (small input above the grid), but the primary path is category → subcategory → product, identical to the public site.

No changes to `/collection` itself. Picker is a thin wrapper over the existing components in `src/components/collection/`.

### Part B — Stop making users retype name/email

1. **Confirm the trigger.** Open `/stylebrief`, fill name + email at Step 4, click Finish, observe whether fields blank before the redirect or only on Back navigation. Check `submit()` in `stylebrief.index.tsx` (lines 185-230) for a stray `setName("")` / form reset.
2. **Persist contact fields** to `sessionStorage` (`stylebrief:contact`) on every change, hydrate on mount. Survives accidental reload, Back, and re-render. Clear only after successful submit + redirect.
3. **Disable-but-don't-blank on submit.** Confirm the submitting state only sets `disabled`, never resets values. If `submit()` throws, fields must remain populated (currently they do, but verify after sessionStorage change).
4. **Thanks page** stays as the success destination; no contact data shown there.

### Out of scope

- No changes to the public `/collection` route, the inquiries table, the email templates, or the 3D viewer (`/stylebrief/three`).
- No redesign of Steps 1, 3, 4 — only Step 2's picker swaps, plus the contact-field persistence fix.

### Technical notes

- New file: `src/components/studio/CollectionPicker.tsx`. Imports `CategoryTonalGrid` and the subcategory/product-grid pieces already used by `collection.tsx`. Accepts `pinned: string[]`, `onPin`, `onUnpin` — same contract as `CatalogPickerTab`.
- Delete or retire `CatalogPickerTab.tsx` and the catalog tab inside `StudioBrowser.tsx` only after the new picker is wired and confirmed working (per the dead-code memory rule — ripgrep first, flag before delete).
- Contact persistence: small `useEffect` pair in `stylebrief.index.tsx`, no new dependency.

### Verification before I say it's done

- Manually walk the flow in the preview: pick a category tile → pin 2 products → back to grid → pin from a second category → fill contact → submit → confirm `inquiries` row + email log, then hit Back and confirm fields are still filled.

Want me to build it?