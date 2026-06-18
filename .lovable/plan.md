# One Bulletproof Pass: Terminology + Style Brief Hardening

Goal: ship the safe terminology consolidation AND lock in the style brief download/email work already started, in a single coordinated pass with no mass rewrites and no internal renames.

## Guardrails (non-negotiable)

- No internal renames. Component names, hooks, props, DB columns, table names, route param names, type names: untouched. Copy-only edits.
- No `/collection` sort logic touched. "Tonal" sort mode stays.
- "Tones" stays as brand DNA wherever it refers to the color concept on /collection and on tonal grids. Only the umbrella *label* changes in 2 spots.
- "Pieces" stays in editorial/brand copy. Only swap where it reads awkwardly inside the style brief flow.
- Admin sidebar "Inquiry" → DEFER. Flag for Adrienne. Do not change in this pass.

## Part 1 — Terminology (22 edits, 9 files)

### Contact form + emails (highest visibility)
- `src/routes/contact.tsx`
  - L233 "Just received your last inquiry" → "...your last style brief request"
  - L240 email subject "Inquiry" → "Style Brief Request"
  - L471 "Every inquiry is personally reviewed" → "Every style brief request..."
  - L478 "HAVE A VISION BOARD?" → "HAVE YOUR INSPO IMAGES?"
  - L597 "...IN THE CATALOG" → "...IN OUR COLLECTION"
  - L713 placeholder "INVENTORY REFERENCES" → "COLLECTION ITEMS"
  - L750 button "SEND INQUIRY" → "SEND STYLE BRIEF REQUEST"
  - L920 "YOUR INQUIRY IS WITH THE ATELIER" → "YOUR STYLE BRIEF REQUEST..."
- `src/lib/email-templates/inquiry-notification.tsx` — "New inquiry"/"NEW INQUIRY"/"SELECTED PIECES"/"Inquiry ID"/"New Hive inquiry" → style brief request variants; keep "pieces" only where editorial. (Already partly touched in last pass — verify final strings.)
- `src/lib/email-templates/inquiry-confirmation.tsx` — "received your inquiry"/"YOUR INQUIRY"/"PIECES SELECTED" → style brief request variants.

### Style brief surface
- `src/routes/stylebrief.index.tsx`
  - L331 "browse by category" → "browse our collection"
  - L345 "Pin pieces above" → "Select items from our collection"
  - L459 placeholder "references" → "your inspo images"
  - L469 "Pieces You Pinned" → "Items You've Selected"
  - L530 label "References" → "Your Inspo Images"
- `src/routes/stylebrief.$token.tsx` L11 "Style Board" → "Style Brief" (page title + heading)
- `src/components/studio/board/BoardDeck.tsx`
  - L167 cover "Style Guide" → "Style Brief"
  - L244 "Palette" → "Color Palette"
- `src/components/studio/PaletteTab.tsx` L32 "Combined palette" → "Combined color palette"
- `src/components/studio/StyleBoardCanvas.tsx` L18 "Drop inspiration images" → "Drop your inspo images"
- `src/components/studio/CollectionPicker.tsx` — "Browse By Category" → "Browse our collection" (already done last pass, verify)

### Explicitly NOT changing this pass
- `admin.studio.tsx` "Inquiry" label (needs Adrienne)
- All "pieces" on /collection (brand voice)
- "Tones" on /collection or TonesTab (brand DNA)
- Any component/hook/table name
- `useInquiry`, `inquiries` table, `style_board` column

## Part 2 — Style Brief Hardening (lock in last pass + close gaps)

Already shipped last turn (verify intact):
- Visitor PDF download button on `/stylebrief`
- `notify-inquiry` route accepts palette/tones/insights/inspo_paths
- Notification + confirmation emails render palette swatches
- Inspo signed URLs (7-day TTL) in staff email

Gaps to close in this pass:
1. **Verify the submit→notify wire actually fires.** Read `stylebrief.index.tsx` submit handler end-to-end, confirm the POST to `/api/public/notify-inquiry` happens AFTER DB insert and includes all 4 fields (palette, tones, insights, inspo_paths). Log on failure, don't silently swallow.
2. **PDF capture timing.** `html2canvas` on signed inspo URLs can race. Add `await Promise.all(images.map(decode))` before `downloadDeckPDF` so the PDF never renders with broken thumbs.
3. **Empty-state guard on download button.** Disable + tooltip "add a palette, inspo, or pinned piece first" when brief is empty. Prevents a blank PDF.
4. **Email idempotency.** Pass `idempotencyKey = stylebrief-${inquiryId}` on the notify call so a retry doesn't double-send.
5. **Confirmation email recipient correctness.** Confirm the confirmation email goes to the submitter, not staff, and uses the same palette block.

## Part 3 — Execution order (one pass, parallel where safe)

```text
Step 1 (parallel reads): contact.tsx, stylebrief.index.tsx,
        BoardDeck.tsx, both email templates, notify-inquiry.ts
Step 2 (parallel writes): all 9 copy-only files (Part 1)
Step 3 (sequential): style brief hardening fixes 1–5 (Part 2)
Step 4: Playwright pass — submit a brief end-to-end,
        download PDF, screenshot, verify email payload via server logs
Step 5: Report back with screenshots + the one Adrienne question
        (admin sidebar "Inquiry" label)
```

## Why this is "high ceiling"

- Terminology is now consistent across the funnel: visitor sees "your inspo images" → "our collection" → "style brief" → "style brief request" in confirmation. One vocabulary, top to bottom.
- Style brief becomes a real deliverable: download works, email carries the full visual payload, signed URLs don't expire mid-review.
- Zero internal churn means future feature work (admin curation, AI palette analysis, etc.) builds on the same component/table names — no migration debt from this pass.

## Risk: low
- All edits are string-level in JSX/email templates.
- No schema, no route signatures, no hook contracts.
- One deferred decision (admin "Inquiry" label) flagged, not silently changed.

Approve and I'll execute Steps 1–5 in order, screenshots at the end.