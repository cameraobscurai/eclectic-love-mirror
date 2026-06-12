# QA Fix Pass — Sequenced by Risk

Eight findings, ordered from zero-risk text edits to one isolated perf change. Each step is independently revertable. No batching of perf changes (per project rule).

---

## Tier 1 — Zero-risk text/href edits

### 1. FAQ anchor — pick `working-with-the-hive`
- `src/routes/atelier.tsx:376` — change section `id` from `working-with-the-atelier` → `working-with-the-hive`
- `src/components/footer.tsx:11` — update href hash to match
- Ripgrep `working-with-the-atelier` to catch any other refs before saving

### 2. `/faq` redirect target
- `src/routes/faq.tsx:9` — redirect from `/contact#faq` → `/atelier#working-with-the-hive`

### 3. Contact `og:image`
- `src/routes/contact.tsx` head() — add `og:image` + `twitter:image` using the existing root social asset (same URL the root already uses)
- No new asset generation needed

**Verify:** `rg working-with-the-atelier src/` returns 0. Click footer FAQ link, lands on Atelier section. Visit `/faq`, lands on Atelier section. View source on `/contact`, og:image present.

---

## Tier 2 — Contact form a11y (scoped, presentation-only)

### 4. Wire error to inputs
- `src/routes/contact.tsx:688` area — add `aria-invalid={!!errorMsg}` and `aria-describedby="contact-error"` to the relevant input(s); give the error `<p>` `id="contact-error"` and `role="alert"`
- No logic change, no validation rewrite

**Verify:** screen reader announces error on submit. Visual unchanged.

---

## Tier 3 — Gallery lightbox focus trap

### 5. Add focus trap to `GalleryLightbox`
- `src/components/gallery/GalleryLightbox.tsx:155`
- Lowest-risk approach: wrap modal contents in Radix `Dialog` primitive (project already uses shadcn) — gets focus trap, ESC handling, scroll lock for free
- If swapping to Radix is too invasive, fallback: manual focus trap via `useEffect` capturing Tab/Shift-Tab within a ref'd container, restore previous activeElement on close

**Verify:** open lightbox, tab repeatedly, focus stays inside. ESC closes. Focus returns to trigger.

---

## Tier 4 — Image double-fetch (one isolated perf change)

### 6. Drop duplicate request in `NormalizedProductImage`
- Render `<img>` and probe must agree on `crossOrigin`
- Safer of the two: remove `crossOrigin="anonymous"` from the probe (matches the render path, browser caches one request)
- Keep the silhouette fallback intact
- Profile collection page before/after per perf rule

**Verify:** DevTools network panel — each tile image = 1 request, not 2. No silhouette regression on tall/wide products.

---

## Tier 5 — Defer (need user verification first)

### 7. `the-hive.tsx` vs `the-hive3.tsx`
- Do NOT delete either. Per dead-code rule: ripgrep both filenames + any export names, check `routeTree.gen.ts`, check footer/nav links
- Produce a manifest (which one is linked, which is orphaned) and surface to user
- No code change this pass

### 8. ProductTile skeleton blank (already covered separately)
- This was the previous turn's diagnosis. Skeleton needs to render outside the opacity gate
- Treat as its own isolated change, profile before/after, ship separately from this pass to keep blast radius small

---

## Risk profile

| Step | Files touched | Behavior change | Visual change | Revert cost |
|------|---------------|-----------------|---------------|-------------|
| 1    | 2             | href targets    | none          | 1 edit      |
| 2    | 1             | redirect target | none          | 1 edit      |
| 3    | 1             | meta tag added  | none          | 1 edit      |
| 4    | 1             | aria attrs      | none          | 1 edit      |
| 5    | 1             | focus behavior  | none          | 1 edit      |
| 6    | 1             | network pattern | none          | 1 edit      |

Each step is a single-file or two-file edit. No migrations, no schema, no shared state, no batched perf work. If anything regresses, the offending step reverts in isolation.

---

## Stop conditions

- Step 5: if Radix Dialog swap touches more than the lightbox file → fall back to manual focus trap, don't expand scope
- Step 6: if profile shows regression or silhouette bug → revert, leave double-fetch in place for now
- Steps 7 & 8: do not start without explicit go-ahead
