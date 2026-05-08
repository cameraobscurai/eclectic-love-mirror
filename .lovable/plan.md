# Contact page — Selected Items reliability

Three tightly-related fixes in `src/routes/contact.tsx` (no schema, no hook changes).

## 1. Visible "Selected items" summary before submission

Today the "SELECTED FROM COLLECTION" list only renders after the async `inventory_items` lookup finishes. If hydration is slow, fails, or an id no longer matches the catalog, the list silently disappears and the user has no idea what's attached.

Change: render the section as soon as `initialIds.length > 0`, regardless of hydration state.

- Build a derived `selectedRows` array from `initialIds` (the merged URL + localStorage list).
- For each id, look up the hydrated row in `pieces` by id. If found, show `title` + `category`. If not yet found, show a placeholder row (`"LOADING…"` and the short id, e.g. last 6 chars) with the same REMOVE control.
- Counter shows `initialIds.length`, not `pieces.length`.
- REMOVE removes the id from a new local `removedIds` set so it disappears from both `selectedRows` and the submitted payload (and is also stripped from the inquiry store on success, same as today).

This guarantees the user always sees what will be attached before they submit.

## 2. Wait/guard on Send Inquiry until titles hydrate

Add an explicit hydration state machine instead of inferring from `pieces.length`.

- New state: `selectionStatus: "idle" | "loading" | "ready" | "error"`.
  - `idle` when `initialIds.length === 0`.
  - `loading` when there are ids and the supabase query has not resolved.
  - `ready` after the query resolves (even if some ids weren't found — they stay as placeholder rows but submission is allowed).
  - `error` when the query throws — show a small notice "Couldn't load item titles — they'll still be sent by id."
- The submit button is `disabled` when `submitting || selectionStatus === "loading"`.
- Button label reflects the gate: `LOADING SELECTED ITEMS…` while loading, `SENDING…` while submitting, `SEND INQUIRY` otherwise.
- `onSubmit` early-returns with a friendly message if somehow invoked while loading (defense in depth against Enter-key submits).

This removes the race the QA pass hit, where submit fired before `pieces` populated.

## 3. Guarantee `item_id` and the "Selected from Collection" block

The payload currently uses `pieces[0]?.id ?? null` and only appends the block when `pieces.length > 0`. Both depend on hydration succeeding. Fix:

- Compute `effectiveIds = initialIds.filter(id => !removedIds.has(id))` at submit time.
- Set `item_id: effectiveIds[0] ?? null` — derived from ids, not from hydrated rows. Null only when the user truly has nothing selected.
- Append the "— Selected from Collection —" block whenever `effectiveIds.length > 0`. For each id, prefer the hydrated `title (category)` from `pieces`; fall back to `Item <id>` when hydration didn't return that row, so the message always lists every selected piece by id.

Net effect: a user arriving from the Collection tray with N items will always send N items, with `item_id` set to the first, even if the catalog query is slow or partially fails.

## Out of scope (explicitly not changing)

- `useInquiry` hook, RLS policies, the `inquiries` table schema.
- Collection page handoff (already writes ids correctly to localStorage and `?items=…`).
- Visual styling of the section beyond the placeholder row.

## Files touched

- `src/routes/contact.tsx` — only file edited.
