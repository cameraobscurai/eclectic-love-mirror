This is the direction: hardened archive website, not another demo. Make grounded senior-level decisions within the auction-house inventory model. Preserve the working data and interaction systems, fix copy, scroll, touch handling, accessibility, and production polish.

All 12 of your refinements are absorbed. The rail-stability correction is the load-bearing one: order is locked from the full catalog, zero-count rows mute (never disappear, never reorder) once the debounced search commits.

## Audit (what's already correct, what isn't)

Already correct, will not touch:

- Auction-house IA: left rail desktop, bottom-sheet mobile, single utility row, white object grid, no overview bands, no top category rail, no right index.
- Site nav copy, the 876 public-ready count, Broadway 32in exclusion (data-side), `phase3_catalog.json`, `collection-browse-groups.ts` (99.2% coverage), `collection-sort-intelligence.ts`, all design tokens.

Needs production-hardening:

1. Page H1 says "The Archive"; intro contains "one-of-one". Both wrong.
2. `<head>` description still says "rental archive of one-of-one ... bespoke pieces."
3. Sort menu lists Newest/Oldest, but `scrapedOrder` is scrape order, not chronology.
4. By Type sort uses an inline owner-rank → A-Z fallback; the richer `sortProductsForCollection` is unused.
5. Filter rail `getBrowseGroupOptions(searchFiltered)` reorders + removes rows on every keystroke → category navigation jumps.
6. No scroll-to-results when a filter commits — selecting a category from a deep-scrolled grid leaves the user looking at the wrong rows.
7. Quick View opens/closes can let the page jump because we never pinned `history.scrollRestoration`.
8. Mobile sheet has no swipe-to-close, no drag handle, no focus trap, no `inert` on the page behind it; rail rows in the sheet are < 44px tall.
9. A11y: rail rows mix `aria-current` semantics with toggle behavior, density toggle buttons lack `aria-label`s, sort `<select>` has no visible label, product tile `<button>` has no descriptive `aria-label`.
10. Result-meta `motion.p` re-animates on every Load More tap and during typing.
11. Inquiry tray: "Clear" should be "Clear All", CTA "Review inquiry" should be "Inquiry".
12. URL param `d` for density is fine but reads obscurely next to `view` (Quick View id). Rename to `density` to remove any visual ambiguity. (`view` keeps Quick View id — no conflict.)

## Scope of changes

### A. Copy truth — `src/routes/collection.tsx`, `src/components/collection/InquiryTray.tsx`

- H1: "The Archive" → **"The Collection"**
- Intro paragraph → exact spec copy: *"A working rental inventory of furniture, lighting, tableware, and bespoke pieces. Browse by category, search by name, then add favorites to an inquiry."*
- `<head>` description → same intro sentence (drop "one-of-one", drop "archive").
- Result meta language: keep "pieces" for browse, switch search-mode phrasing to use **"results"** ("{n} results matching `{q}`").
- Sort `<select>` gains a visible **"Sort by"** label (`<label htmlFor>`).
- Mobile sheet header reads **"Filters"** (matches the trigger button).
- Inquiry tray: **"Clear All"** and CTA **"Inquiry"**. No "Review", no "Save", no cart language.
- No new copy beyond this pass. No invented descriptions, no "save search", no marketing language.

### B. Truthful sort — `src/routes/collection.tsx`

- `<select>` options reduced to **"By Type"** (default) and **"A–Z"** only. Newest/Oldest removed entirely.
- Zod enum tightened to `["type", "az"]`. Old `?sort=newest` URLs fall back to `"type"` via `fallback()`.
- "By Type" branch wired to `sortProductsForCollection(list, { mode: "by-type" })` from `collection-sort-intelligence.ts` — uses owner rank → original-site type rank → `scrapedOrder` → A–Z.
- "A–Z" branch goes through the same helper (`mode: "az"`) so we have one sort code-path.

### C. Filter rail stability — `src/routes/collection.tsx`, `src/components/collection/CollectionFilterRail.tsx`

This is the corrected behavior, per your point 3:

- The **ordered group list** is computed once from the **full public-ready catalog** (`products`), memoized on `[products]`. It does not depend on search or filter state. The set of visible rows and their order never change while typing.
- **Counts** are computed from the search-filtered set, memoized on `[searchFiltered]`. Counts update on the URL-committed `q` (after debounce), not on every keystroke.
- Rows with `count === 0` render **muted and disabled** (lower opacity, `aria-disabled="true"`, click is a no-op) rather than disappearing. Calmer, prevents nav from vanishing under the user's cursor.
- "Clear All" still only renders when `hasActiveFilters`.

### D. Scroll-to-results — `src/routes/collection.tsx`

- Add `<div ref={resultsTopRef} id="results-top" className="scroll-mt-32" aria-hidden />` immediately above the grid container.
- After **committed** filter changes (URL `group`, `sort`, or debounced `q`), call `resultsTopRef.current?.scrollIntoView({ block: "start", behavior: prefersReducedMotion ? "auto" : "smooth" })` inside `requestAnimationFrame` so layout has settled.
- Does **not** scroll on:
  - keystrokes before debounce commits
  - opening or closing Quick View
  - Load More
  - density toggle
- Sticky utility bar offset handled with `scroll-margin-top` (Tailwind `scroll-mt-32`).

### E. Quick View scroll restoration — `src/routes/collection.tsx`, `src/components/collection/QuickViewModal.tsx`

- On Collection route mount, snapshot `const prev = history.scrollRestoration; history.scrollRestoration = "manual";` and restore `history.scrollRestoration = prev` in cleanup. (Per your point 5 — never leak the global change.)
- When Quick View opens, snapshot `window.scrollY` to a ref before applying body scroll lock. On close, after the lock releases, restore via `window.scrollTo({ top: snapshot, behavior: "auto" })` inside `requestAnimationFrame` so the grid lands in the same row the user left.
- Back-button close already works (`replace: false` on the `view` param). The scroll-restore guard above prevents a perceptible jump.
- Modal: track the originating tile element via `document.activeElement` at open time; on close, return focus there if still in DOM, else fall back to the Filters trigger.

### F. Mobile bottom-sheet — `src/routes/collection.tsx`

- **Drag handle**: `h-1 w-10 bg-charcoal/15 rounded-full mx-auto mt-2.5` at the top of the panel.
- **Swipe-to-close**: `drag="y"` on the panel with `dragConstraints={{ top: 0, bottom: 0 }}`, `dragElastic={{ top: 0, bottom: 0.3 }}`, `onDragEnd={(_, info) => (info.offset.y > 120 || info.velocity.y > 400) && setSheetOpen(false)}`. No new dependency — Framer is already in.
- **Focus trap** (light, no library): on open, focus the close button; capture Tab/Shift+Tab on the panel and cycle between the first and last focusable elements; Escape closes; on close, return focus to the Filters trigger button (held in a ref).
- **Background inert**: when the sheet is open, set `inert` (with `aria-hidden="true"` fallback for older browsers) on `<main>`. Body scroll lock stays.
- **Apply button** sticky at bottom, label *"Show {n} pieces"* using the *committed* count (avoids ticking during typing inside the sheet — though typing happens outside the sheet today).
- **Clear All** in the sheet only renders when filters are active.
- **44px touch targets**: in the sheet variant the rail rows render with `py-2.5` + `min-h-[44px]`; the close button and Apply button are already ≥ 44px.

### G. Accessibility — multiple files

- `CollectionFilterRail` rows: use `**aria-pressed={active}**` only (toggle semantics). Drop `aria-current` to avoid double-announcement, per your point 7.
- Zero-count rows: `aria-disabled="true"`, `tabIndex={-1}` from the muted state, `disabled` on the underlying `<button>`.
- Density toggle: each button gets `aria-label="Comfortable grid"` / `"Dense grid"`, keep `aria-pressed`.
- Sort `<select>`: visible `<label htmlFor="sort">Sort by</label>` (label visually compact on mobile, full on desktop).
- Product tile `<button>`: `aria-label={`Open ${product.title}`}`.
- Quick View Prev/Next: keep existing `aria-label` ("Previous piece" / "Next piece"), add `aria-keyshortcuts="ArrowLeft"` / `"ArrowRight"`. When `disabled`, the buttons are semantically `disabled`, not just visually dimmed (already correct — verifying).
- Global focus: ensure every interactive surface uses `focus:outline-none focus-visible:ring-2 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white`. No `:focus` ring shown on mouse click.

### H. Image performance — `src/components/collection/ProductTile.tsx`

- Keep: first 6 `fetchpriority="high"`, first 12 `loading="eager"`, rest lazy, deferred render shell beyond viewport, blur-up, failed-image hiding.
- Add: explicit `width={800} height={800}` attributes on `<img>` (the wrapper is already `aspect-square`, so the box doesn't shift; the explicit dimensions help LCP scoring and avoid CLS edge cases).
- **Skip blur on first 6 priority tiles** — no `filter: blur` initial state when `index < 6`, so the LCP image paints crisp.
- `decoding="async"` already set.
- **Skip `content-visibility**` for now, per your point 8 caution. The deferred render shell already covers the long tail; layering `content-visibility` on top of Framer Motion `layout` + `AnimatePresence` is a known source of measurement glitches. Leave the existing system alone.

### I. Result-meta calm — `src/routes/collection.tsx`

- Motion key drops `visibleBatch.length`. New key: `${activeGroup}-${q}-${sort}` (URL-committed values only).
- Result-meta text still updates on every render (it reads `visibleProducts.length`), but the entrance animation only fires on real filter commits — not Load More, not keystrokes.

### J. URL state — `src/routes/collection.tsx`

- `view` continues to mean Quick View product id.
- `d` renamed to `**density**` for clarity, per your point 11. Zod fallback handles missing values; no migration concern (no published deep links).
- Final search schema: `{ group, q, sort, density, view }`.

### K. Things explicitly NOT changing

- `phase3_catalog.json`, the 876 count, the Broadway 32in exclusion (data-side), `collection-browse-groups.ts`, `collection-sort-intelligence.ts`, navigation component, design tokens, route structure, backend, RLS, no DB writes, no client CSV parsing.
- No new dependencies. No new visual surfaces. No new routes. No invented copy.

## Files touched

- `src/routes/collection.tsx` — copy, sort enum + sort-intelligence wiring, results anchor + scroll commit, sheet swipe + handle + inert + focus trap + restore-focus, rail data split (order from full catalog, counts from filtered), `density` rename, meta key, scrollRestoration guard.
- `src/components/collection/CollectionFilterRail.tsx` — accept `orderedGroupIds` and `counts` separately, render 0-count rows muted + disabled, `aria-pressed`, `:focus-visible` ring on the row, sheet variant uses `min-h-[44px]` rows.
- `src/components/collection/InquiryTray.tsx` — "Clear" → "Clear All", CTA "Review inquiry" → "Inquiry", `:focus-visible`.
- `src/components/collection/ProductTile.tsx` — `aria-label`, explicit `width`/`height`, no blur on first 6.
- `src/components/collection/QuickViewModal.tsx` — `aria-keyshortcuts`, focus-return ref pattern, scrollY snapshot/restore handled by the route.

## Verification (per your point 12)

After implementation I will run and report:

- `rg -n "Archive|one-of-one|limited pieces|Save Search|Review inquiry|cart|checkout|price" src/` and report any visible-copy hits (CSV/data noise excluded).
- Sort menu shows only **By Type** and **A–Z**.
- Public-ready count remains **876**.
- Broadway 32in remains excluded.
- Selecting a category scrolls the grid to results-top with sticky-bar offset respected.
- Typing in search does not reorder or hide rail rows; zero-count rows mute after debounce.
- Mobile sheet: focus trap works, swipe-down closes, Escape closes, Close button closes, Apply closes; focus returns to Filters trigger.
- Quick View open/close preserves grid scroll; back button closes Quick View without jumping; `history.scrollRestoration` is restored on unmount.
- First visible images become crisp quickly (no blur on first 6).
- Grid stays a pure white object field. No prices, no cart language, no demo-only UI.
- No new dependencies added.

Anything that fails verification gets reported, not papered over.  
  
  
This refined plan is strong. I would approve it.

It is correctly scoped as a **production hardening pass**, not a new design pass. It keeps the locked auction-house model, protects the working catalog data, fixes the false copy, removes unsupported sort options, stabilizes the filter rail, improves scroll behavior, hardens the mobile sheet, and adds accessibility without introducing new dependencies or new visual surfaces.

The most important parts are right:

```

```

```
- No changes to phase3_catalog.json
- Public-ready count stays 876
- Broadway 32in stays excluded
- No new dependencies
- No overview bands
- No category rail
- No right index
- No card chrome
- No fake copy
- Sort only uses truthful options
- Filter rail order stays stable while typing
- Mobile sheet gets real touch/accessibility behavior
```

I would send this back to Lovable:

```

```

```
Approved. Proceed with this production-hardening pass.

This is the correct scope:
- copy truth
- truthful sort
- stable filter rail
- scroll-to-results behavior
- Quick View scroll preservation
- mobile bottom-sheet handling
- accessibility polish
- image performance cleanup
- no new dependencies
- no data mutation
- no new visual systems

Keep the auction-house archive model locked:
- desktop left rail
- mobile bottom sheet
- single utility row
- white object grid
- no overview bands
- no top category rail
- no right index
- no card styling

A few final guardrails before implementation:

1. Do not overuse “results”

Use:
- “876 pieces” for normal browse mode
- “Sofas · 44 pieces” for group mode
- “24 results matching ‘chair’” for search mode only

Do not replace all count language with “results.” “Pieces” is better for inventory browsing.

2. Keep zero-count rail rows stable, but visually quiet

The muted/disabled approach is correct.

When search is active:
- keep the group order stable
- mute zero-count rows
- do not reorder
- do not remove rows during typing

If the rail feels too visually noisy with many zero-count rows, only then consider hiding zero-count rows after debounce, but the first implementation should prioritize stability.

3. Be careful with inert

Apply inert/aria-hidden only to the correct page content behind the mobile sheet.

Do not inert the sheet itself.
Do not inert the portal root if the sheet is rendered inside it.
Do not break keyboard focus.

If inert causes issues in the current DOM structure, use aria-hidden fallback carefully and prioritize the focus trap + body scroll lock.

4. Scroll-to-results should not fight the user

Scroll to results only when committed filters change:
- group
- q after debounce
- sort
- clear all

Do not scroll on:
- Load More
- density changes
- Quick View open/close
- local search keystrokes before debounce

5. history.scrollRestoration must be restored

The plan already says this, but treat it as mandatory.

On mount:
- save previous value
- set manual

On cleanup:
- restore previous value

No leaking global browser behavior.

6. Density rename is approved

Rename d to density.

Keep view reserved for Quick View product id.

Final search schema:
- group
- q
- sort
- density
- view

7. Skip content-visibility for now

Good call. Do not layer content-visibility on top of Framer Motion layout and deferred shells until the page is fully stable. The existing deferred rendering is enough.

8. Verification matters

Run the rg sweep exactly as planned.

Do not hide failures. Report them.

Especially check for:
- Archive
- one-of-one
- limited pieces
- Save Search
- Review inquiry
- cart
- checkout
- price

If any appear in source data only, mark them as data noise. If any appear in visible UI, remove them.

Proceed.
```

The only real caution I have is around the mobile sheet `inert` behavior. That can break focus if the sheet lives inside the same container being marked inert. As long as Lovable applies it to the background content only, the plan is good.

Everything else is the correct kind of hardening. This is the pass that moves the page from “working prototype” to “real website.”