
# Inquiry folder — make it actually work end-to-end (collection → contact → DB)

Scope: only the **submission half**. The admin inbox (status pills, notes, etc.) becomes a follow-up PR that just reads the data this PR persists. We're fixing the leak first.

## What's wrong today

1. **Lossy submit.** `contact.tsx` writes only `item_id = effectiveIds[0]` to `inquiries`. If staff get a 12-piece inquiry, the DB knows about 1 piece — the other 11 are buried in plain text inside `message`. Admin can't render them, can't link back, can't filter.
2. **No image proof.** Selected pieces render with thumbnails on `/contact`, but those thumbnails are never persisted with the inquiry. If a piece's image URL changes later (rebind, mirror swap), the admin view of that historical inquiry shows a broken/different image.
3. **Project metadata is unstructured.** `projectDate`, `budget`, `scope` are concatenated into the message body. Same problem: admin can't filter "all weddings in June" or "$10k+ budgets".
4. **No removal persistence.** A user can `REMOVE` an item from the preview list, submit, then reload — the inquiry tray (localStorage) still has the original ids. Minor, but confusing if they re-open `/contact`.
5. **Image hydration race on the preview itself.** The current `useEffect` queries Supabase by id; if it errors or returns fewer rows than requested, the missing rows show "ITEM XXXXXX" with a blank thumbnail tile and the user has no way to know *why*. Submit button stays enabled. Worth tightening.

## What this PR ships

### A. DB shape (one migration)

Add to `inquiries`:
- `item_ids uuid[] not null default '{}'` — full ordered selection
- `item_snapshots jsonb not null default '[]'` — frozen at submit time, one entry per item:
  ```json
  { "id": "...", "title": "...", "category": "...", "image_url": "..." }
  ```
  This is the "image proof" — even if the catalog rebinds tomorrow, the admin inbox always shows what the customer actually saw.
- `metadata jsonb not null default '{}'` — `{ project_date, budget, scope }` (and room for future structured fields).
- Keep existing `item_id` column populated with `item_ids[0]` for backward compat with any current admin code; mark it as "legacy, prefer item_ids" in a comment.

RLS: no change — existing anon-insert and admin-select policies cover the new columns.

Public insert WITH CHECK gets one new bound: `cardinality(item_ids) <= 50` and a JSON size sanity cap (`octet_length(item_snapshots::text) < 16000`) so a malicious client can't dump megabytes.

### B. Contact form (`src/routes/contact.tsx`)

Submission changes (no visual change to the form):
- Build `item_snapshots` from `pieces` (the already-loaded preview data) — only for ids still in `effectiveIds`. Use `withCdnWidth(image, 480)` so the snapshot stores a reasonable size.
- Send `item_ids: effectiveIds` and `metadata: { project_date, budget, scope }` in the payload.
- Keep building the human-readable `message` body for staff who skim email-style — but it's now redundant context, not the source of truth.
- After successful insert: call `clearInquiry()` to empty the localStorage tray (fixes #4).

Preview-list polish (small, high-value):
- If `selectionStatus === "error"` or any id failed to resolve, show a clear inline notice listing the missing short-ids and **disable the submit button** until the user removes them or retries. Today it silently submits with placeholder titles.
- Add a "Retry" button next to the error notice that re-runs the fetch.
- Image tile gets a subtle fallback chip with the category initial when `thumb` is null, instead of an empty grey square — gives the user confidence the row is real.
- Add a one-line confirmation in the success state: "We've logged your inquiry with N pieces." so the user knows the selection was received (right now success state is generic).

### C. Inquiry tray (`src/components/collection/InquiryTray.tsx` + `use-inquiry.ts`)

- No schema change. Tray already works. Two small fixes:
  - When `clearInquiry()` is called from `/contact` after submit, the tray's `AnimatePresence` exit animation needs to play even though the user has already navigated away. Move `clearInquiry()` into a small `useEffect` on the success screen so the storage event fires after the success view is mounted (not mid-submit).
  - Tray currently dedupes by id but doesn't bound size. Add a soft cap of 50 with a toast ("Inquiry list full — review at /contact") matching the new DB cap so client and server agree.

### D. Out of scope (next PR)

- Admin inbox UI consuming `item_ids` + `item_snapshots` + `metadata` (status pills, notes, mark-handled).
- Backfilling `item_ids` for historical inquiries — they keep working via `item_id`.

## Acceptance checks

- Submit a 5-piece inquiry → DB row has `item_ids = [5 uuids]`, `item_snapshots` length 5, each snapshot has a working image URL, `metadata` has the 3 project fields populated.
- Remove 2 pieces in the preview, submit → DB row reflects the 3 remaining only, in original order.
- Submit, navigate back to `/collection` → tray is empty (localStorage cleared).
- Force one selected id to be invalid (manual URL edit) → preview shows the error notice listing the bad id, submit disabled until removed or retried.
- Reload `/contact?items=<one valid, one invalid>` → preview hydrates the valid one with image, flags the invalid one, button disabled.
- Image rebind script swaps a mirror URL after submission → opening the (future) admin row still shows the historical thumbnail from `item_snapshots`, not the new live URL.

## Files touched

- `supabase/migrations/<new>.sql` — columns + bound checks on `inquiries`.
- `src/routes/contact.tsx` — payload shape, error/empty/success states, snapshot builder, post-submit `clearInquiry`.
- `src/components/collection/InquiryTray.tsx` — soft cap + toast.
- `src/hooks/use-inquiry.ts` — soft cap enforcement in `add`/`toggle`.

No new npm dependencies. No public-site visual change beyond the contact-page error notice and success-line copy.
