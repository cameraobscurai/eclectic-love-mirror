# Polish pass — 5 fixes, one at a time

All five are narrow code-level fixes. None changes layout or visual design, so no design directions are needed. I'll do them in order, verify each before moving on.

## 1. Footer FAQ link → atelier anchor
**Files:** `src/components/footer.tsx`, `src/routes/atelier.tsx`

- Change footer entry from `{ href: "/contact", label: "FAQ", hash: "faq" }` to `{ href: "/atelier", label: "FAQ", hash: "working-with-the-atelier" }`.
- Add `id="working-with-the-atelier"` to the `<Section>` wrapping the FAQ accordion (atelier.tsx line ~376).
- Verify: click footer FAQ → lands on /atelier, scrolls to section.

## 2. Home hero SSR hydration mismatch
**File:** `src/components/home/SequentialHeroVideo.tsx`

- Replace `useState(() => Math.floor(Math.random() * HERO_CLIPS.length))` with `useState(0)`.
- Add `useEffect(() => { setIndex(Math.floor(Math.random() * HERO_CLIPS.length)); }, [])` so the random rotation still happens, but only after mount.
- Verify: reload home, console clean of hydration warnings, video still rotates.

## 3. Invalid DOM prop `fetchpriority` → `fetchPriority`
**Files:** `src/components/home/PosterPicture.tsx`, `src/components/home/HeroFilmstrip.tsx`, `src/components/hero-image.tsx`

- Rename JSX attribute from lowercase `fetchpriority` to camelCase `fetchPriority` in all three files. React 19 emits the correct lowercase HTML attribute internally.
- Verify: console clean of "Invalid DOM property" warnings.

## 4. Framer Motion scroll container warning on /contact
**File:** likely `src/routes/contact.tsx` (sticky left column wrapper)

- Locate the sticky/scroll-tracked wrapper Framer is measuring.
- Add `position: relative` (or `className="relative"`) to its container.
- Verify: load /contact, console clean of the "non-static position" warning.

## 5. Route file leaks non-route export
**File:** `src/routes/admin.incoming.tsx`

- Move the `IncomingPage` component to `src/components/admin/incoming-page.tsx` (new file) and import it into the route.
- Drop the named export from the route file so only the `Route` export remains.
- Verify: console clean of the tanstack-router code-split warning.

## Sequencing & verification

After each fix:
1. Reload the affected route in the preview.
2. Read console logs for that route.
3. Move to the next fix only after the prior one is clean.

If any fix breaks something visual, revert that single change and re-plan before continuing — no batching, per the project's perf/dead-code memory rule.

## Out of scope (flagged earlier, not in this plan)

- Missing Collection facets (candlelight, chandeliers, serveware, large-decor, furs-pelts). Needs your call on intent before any UI change.
- Mixed-case "build a style brief →" CTA on /contact. Cosmetic; decide caps vs mixed.
