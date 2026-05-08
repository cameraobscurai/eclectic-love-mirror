# Tighten the gap between filmstrip and Evolution (mobile only)

Just the bottom band — keep top spacing and desktop rhythm exactly as-is. The poster strip is already a strong transition, so Evolution can ride a touch closer on mobile.

## Change

In `src/routes/index.tsx`, on the wrapper `<div>` around `<HeroFilmstrip />`:

- Top padding: unchanged (`paddingTop: var(--fold-strip)`).
- Bottom padding: keep desktop on `var(--fold-tail)` (6 units), but on mobile only reduce it by ~6% of viewport height — roughly halving the tail band. Concretely:

```text
mobile  →  paddingBottom: calc(var(--fold-tail) * 0.45)
md+     →  paddingBottom: var(--fold-tail)
```

Implementation: drop the inline `paddingBottom`, replace with a Tailwind arbitrary-value class pair:
`pb-[calc(var(--fold-tail)*0.45)] md:pb-[var(--fold-tail)]`. Inline `paddingTop` stays.

That lifts Evolution up by roughly 5–7% of the mobile viewport (the tail was ~10–13vh worth), without touching desktop spacing or the strip's own breathing.

## Files touched

- `src/routes/index.tsx` — single style/className tweak on the filmstrip wrapper.

## Verification

- 390×844: noticeably tighter handoff into Evolution, top spacing identical.
- 1303×934: no change.
