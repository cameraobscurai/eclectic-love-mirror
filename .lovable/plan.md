## What's going on today

The "editorial" CTA style (uppercase, tracked, hairline border, fills on hover) is hand-rolled in five places with slightly different tokens:

| Where | Class snippet | Drift |
|---|---|---|
| `atelier.tsx` "START A CONVERSATION" | `text-xs … px-6 py-3` | 38px tall, below 44px touch target |
| `footer.tsx` "START A CONVERSATION" | `text-[11px] … no border` | text link only — fine, but not a "button" |
| `contact.tsx` "SEND INQUIRY" | `text-xs … px-8 py-4` | bigger than atelier's twin |
| `QuickViewModal` "ADD TO INQUIRY" | `text-[11px] … px-6 py-3` | different tracking (0.28em vs 0.22em) |
| `contact.tsx` "REMOVE" | `text-[10px]` ghost | no accessible name beyond "REMOVE" |

Plus a handful of a11y gaps that show up in any audit:

1. **Touch targets.** Atelier CTA, modal inquiry CTA, prev/next, and contact REMOVE all sit at 32–38px. WCAG AA target is 44×44 (or padding that gets there).
2. **Stateful CTAs aren't announced.** "ADD TO INQUIRY" → "ADDED TO INQUIRY" changes label visually but has no `aria-pressed`, no `aria-live`, so screen readers don't get a confirmation.
3. **Submit button.** No `aria-busy` while submitting, no `aria-disabled` (uses `disabled` which removes it from focus + can swallow tooltip context).
4. **Form inputs.** `UnderlineInput` doesn't pass `id`/`name` so labels rely on wrapping `<label>` (works, but no autofill hints, no programmatic name). Email/phone don't set `inputMode`.
5. **REMOVE button.** Reads as just "REMOVE" — needs `aria-label="Remove {piece title} from inquiry"`.
6. **Prev/Next/Close in modal.** Missing `type="button"` (harmless today, footgun if ever placed inside a `<form>`); focus ring is 1px on a transparent bg — fine but inconsistent with the rest of the system (most use `ring-offset-2 ring-offset-cream`).
7. **`disabled` on submit** removes focus and breaks `aria-describedby` patterns. Better: keep focusable, use `aria-disabled` + early-return in handler.

## Plan

### 1. One CTA primitive

Create `src/components/ui/editorial-button.tsx` exporting `<EditorialButton>` and `<EditorialLinkButton>` (the latter wraps `Link` / `<a>` via `asChild`). Variants:

- `variant`: `solid` (charcoal fill) · `outline` (current default) · `ghost` (text-only, footer + REMOVE)
- `size`: `sm` (h-9, px-5) · `md` (h-11, px-7) · `lg` (h-12, px-8) — all ≥ 44px tall
- Built-in: `type="button"` default, unified focus ring (`focus-visible:ring-1 ring-charcoal/40 ring-offset-2 ring-offset-cream`), `motion-safe:transition-colors`, `aria-busy` + spinner-dot when `loading`, `aria-pressed` pass-through.

This replaces the five ad-hoc class strings. Tracking standardizes at `0.22em` for body CTAs, `0.28em` reserved for micro-eyebrows.

### 2. Apply the primitive

- `atelier.tsx` line 275 → `<EditorialLinkButton to="/contact" size="md" variant="outline">`
- `footer.tsx` line 51 → keep as text link (it's a footer link, not a CTA) but bump to `text-[11px]` consistent and add `aria-label="Start a conversation — go to contact page"` for clarity in the link list.
- `contact.tsx` submit (line 388) → `<EditorialButton type="submit" size="lg" variant="outline" loading={submitting}>` (handles `aria-busy`, label swap, keeps focusable while disabled via `aria-disabled`).
- `QuickViewModal` "ADD TO INQUIRY" (line 464) → `<EditorialButton variant={inInquiry ? "outline" : "solid"} size="md" aria-pressed={inInquiry}>` and add a visually-hidden `<span aria-live="polite">` that says "Added to inquiry" / "Removed from inquiry" on toggle.
- `QuickViewModal` PREV/NEXT/Close → add `type="button"`, bump to `h-11 w-11` on mobile (keep `h-8` desktop via `md:`), unify focus ring with offset.
- `contact.tsx` REMOVE (line 356) → wrap in `<EditorialButton variant="ghost" size="sm">` with `aria-label={\`Remove ${p.title} from inquiry\`}`.
- Show Scale toggle (modal line 446) → already has `aria-pressed`; just adopt the primitive at `size="sm"`.

### 3. Form a11y polish (`contact.tsx`)

- `UnderlineInput`: accept `id`, `name`, `inputMode`, `autoComplete`; render them on the input. Update call sites for name (`autoComplete="name"`), email (`type="email"`, `inputMode="email"`, `autoComplete="email"`), phone (`type="tel"`, `inputMode="tel"`, `autoComplete="tel"`).
- `Field`: generate an id, pass via `htmlFor` + clone child with the id (or take an `htmlFor` prop). This makes labels programmatically associated even if the input isn't a direct child.
- Required marker: replace decorative `·` with `<span aria-hidden>·</span>` and add `aria-label="required"` on the field, so SR users get "Full name, required" not "Full name dot".
- Submit error `<p>` (line 384): add `role="alert"` so it's announced when it appears, and link with `aria-describedby` from the submit button.
- Pill group: already has `aria-pressed` ✓. Add `role="group"` + `aria-label` on the wrapper for context.

### 4. Verify

Spot-check at desktop + mobile: tab order, focus rings visible on cream bg, prev/next reachable on touch, submit announces "sending" state, modal inquiry toggle announces. Run `bunx tsc --noEmit` after the edits.

### Out of scope (intentionally)

- Visual restyle — colors, fills, fonts unchanged. This is purely tokenization + accessibility tightening.
- shadcn `<Button>` is left alone; the editorial style is too far from the default variants to be worth shoehorning in.
