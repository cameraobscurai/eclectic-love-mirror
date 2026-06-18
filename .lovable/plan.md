# Tighten Studio Flow — 3 Cleanups

All zero-risk. No behavior change. No user-visible change.

---

## 1. Drop orphaned `studio_briefs` table

Table exists in schema but no code reads or writes it. Anon insert policy was already dropped. Just dead weight.

**Migration:** `DROP TABLE public.studio_briefs CASCADE;`

---

## 2. Fix `markBoardSent` payload construction

Currently relies on `JSON.stringify` dropping `undefined` keys — works, but unreadable.

**File:** `src/lib/studio.functions.ts` (`markBoardSent` handler)

Build the update payload conditionally:
```ts
const update: Record<string, unknown> = { status: "sent", share_token };
if (!existing.share_token) update.sent_at = new Date().toISOString();
```

---

## 3. Regenerate Supabase types

`cover_pinned_rms_id` column is accessed via `as unknown as {...}` cast because types are stale.

**Action:** Regenerate `src/integrations/supabase/types.ts` from the live schema, then remove the cast in `getStyleBoardByToken`.

---

## Order of operations

1. Migration drops `studio_briefs` → types regenerate to reflect new schema
2. Edit `studio.functions.ts` — fix `markBoardSent` + remove cast
3. Verify build passes

Total: 1 migration + 1 file edit.
