## Goal

Keep the current Brief Preview block's structure and data (src/routes/studio.index.tsx lines 484–521) — same `dl` rhythm, same fields, same conditional logic. Layer the proposal-sheet polish from Mood Palette AI on top so it reads as an editorial draft sheet, not a form summary. One file, no new deps, no logic changes.

## What stays

- The `dl` grid pattern and `[140px_1fr]` rail
- Section order: Name → Email → Phone → Event date → Scope → Budget → Inspo count → Pinned count → Palette → Notes
- Conditional rendering of optional fields
- `— REQUIRED —` ghost for empty name/email
- The "Brief Preview · What we'll receive" eyebrow
- Submit row directly below, unchanged

## What gets merged in (the AAA layer)

1. **Frame it as a sheet.** Wrap the block in `<article className="relative border border-charcoal/15 bg-cream px-10 lg:px-14 py-12 lg:py-16 max-w-2xl">`. Replaces the bare `border-t pt-8`. Reads as a physical page on the cream background.

2. **Page chrome, top + bottom.** Two absolute rows of 10px tracking-[0.32em] charcoal/45 text — same pattern as `PageChrome` in Mood Palette AI's ProposalPreview:
   - Top-left: `STYLE BRIEF · DRAFT`  ·  Top-right: today as `MM.DD.YY` via `Intl.DateTimeFormat`
   - Bottom-left: `ECLECTIC HIVE · STUDIO`  ·  Bottom-right: `01 / 01` mono tabular
   - The existing eyebrow ("Brief Preview · What we'll receive") moves into top-left and is retired from its current spot.

3. **Numbered section badges in the dt column.** Each `dt` gets a tiny mono numeral prefix that auto-counts only rendered rows: `01 NAME`, `02 EMAIL`, `03 PHONE`… Tabular-nums, charcoal/35, separated by an em-space from the label. Mood Palette AI uses `String(n).padStart(2, '0')` mono badges throughout — same trick.

4. **Hairlines between rows.** Add `border-t border-charcoal/8` to every `dt` and `dd` (first row excluded). Right now the rows float; hairlines make it scan like a printed ledger.

5. **Palette row, upgraded.** Keep the 8 swatches but:
   - Bump each from `w-6 h-6` to `w-10 h-10` and remove the gap (`gap-0`) so it reads as one continuous bar.
   - Add a second row below the bar with each hex caption in `text-[9px] tracking-[0.18em] tabular-nums charcoal/45`, aligned under its swatch.
   - When not generated, render 8 ghost squares (`border border-charcoal/10`) instead of the text "Not generated" — visual placeholder, no copy.

6. **Notes block, restrained editorial treatment.** When `vibe` is filled, render it as a left-rule blockquote: `border-l border-charcoal/25 pl-4 italic font-display text-[15px] normal-case leading-snug`. Only mixed-case element on the sheet — same gesture Mood Palette AI uses for statement blocks. Caps everywhere else stays intact.

7. **Inspo + Pinned counts get a thumbnail rail.** Same `dd` slot, but instead of a bare number:
   - Inspo: `{n}` followed by up to 6 small `w-7 h-7` thumbs from `inspo[].url`. `+N` chip when over 6.
   - Pinned: `{n}` followed by up to 6 small `w-7 h-7` thumbs from `catalog.get(id)?.primaryImage?.url`. `+N` chip when over 6.
   - Both inline, no extra text. Data already in scope.

8. **Required ghosts: tighten.** Replace plain text with a dashed-underline ghost: `<span className="text-charcoal/30 border-b border-dashed border-charcoal/20 pb-0.5">— REQUIRED —</span>`. Communicates "field is waiting" without copy.

9. **Subtle motion on mount.** One CSS-only fade-up on the article via `animate-in fade-in slide-in-from-bottom-2 duration-500` (Tailwind animate plugin already used in the project). No JS, no library, no perf risk.

10. **Print-quality typography hygiene.**
    - `font-variant-numeric: tabular-nums` on all numeric `dd`s (counts, date).
    - `tracking-[0.18em]` stays for caps; numerals use `tracking-normal tabular-nums`.
    - Email keeps `normal-case tracking-normal` (already there) — addresses should never be uppercased.

## Implementation

Single edit to `src/routes/studio.index.tsx`:

- Replace lines 484–521 with the new sheet markup.
- Add a small `SectionRow` helper above the `Field` helper at the bottom of the file — takes `{ n, label, children, mono? }` and renders the `dt`/`dd` pair with hairline + numeral badge. Keeps the JSX scannable.
- Add a `useMemo` for the active section list (filters out unrendered conditional rows) so the numbering stays sequential without gaps.
- Today's date formatted once at component top: `const stamp = new Intl.DateTimeFormat("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" }).format(new Date()).replace(/\//g, ".");`

No new imports beyond what's already in the file. No new packages. No route, server, or schema changes.

## QA before done

- Empty form: sheet renders with chrome, all `— REQUIRED —` ghosts visible, 8 ghost palette squares, numbering 01/02, no console errors.
- Full form (name, email, phone, date, scope, budget, palette generated, 3 inspo, 5 pinned, notes): every row renders, numbering is sequential 01–10, thumbnails appear inline, blockquote renders italic mixed-case, palette bar is continuous with hex captions aligned.
- 1202px viewport (current): sheet is max-w-2xl, chrome corners pinned, hairlines crisp at 1px.
- 375px mobile: chrome wraps without overlap, thumbnails downscale to `w-6 h-6` if needed via responsive class.
- All-caps rule respected everywhere except email value and notes blockquote.
- Visual check via browser--screenshot after edit, before declaring done.
