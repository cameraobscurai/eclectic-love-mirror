## W1.2 wiring — four admin handlers + concurrency guard + audit

Continuing the same PR as W1.1 (audit table + `_audit.server.ts` helper). Goal: wire `audit()` + `expectedUpdatedAt` concurrency guard into the four privileged inventory mutations, following the read-once snapshot pattern you specified.

### Pattern (applied identically to all four handlers)

```ts
// 1. Read once — snapshot drives both concurrency check AND audit `before`
const { data: current, error: readErr } = await supabaseAdmin
  .from("inventory_items")
  .select("id, updated_at, <fields touched by this handler>")
  .eq("id", data.id)
  .single();
if (readErr || !current) throw new AppError("NOT_FOUND", "Item not found", 404);

// 2. Concurrency check against the snapshot
if (data.expectedUpdatedAt && current.updated_at !== data.expectedUpdatedAt) {
  throw new AppError("STALE", "Someone else edited this. Reload.", 409);
}

// 3. Mutate
const { data: updated, error: writeErr } = await supabaseAdmin
  .from("inventory_items")
  .update({ <new shape> })
  .eq("id", data.id)
  .select("id, updated_at, <same fields>")
  .single();
if (writeErr) throw writeErr;

// 4. Audit — `before` is the snapshot we read, `after` is mutated fields only
await audit({
  actorId: context.userId,
  entity: "inventory_items",
  entityId: data.id,
  action: "<handler-specific>",
  before: pick(current, [<touched fields>]),
  after: pick(updated, [<touched fields>]),
});

return updated;
```

Note: `AppError` doesn't exist yet (W2.2). For W1.2 throw plain `Error("STALE: ...")` / `Error("NOT_FOUND: ...")` with a TODO comment to swap in `AppError` during W2. Avoids cross-week coupling.

### Race-window acknowledgement

Read and update are NOT in a transaction. A concurrent writer could land between step 1 and step 3. Accepted: `before` reflects what the handler saw, not necessarily what was in the DB the instant before the write. Snapshot wins. Documented as a code comment above each `audit()` call so future readers don't "fix" it by re-reading after the update.

### The four handlers

All live in admin server-fn modules (currently called from `useEffect`-driven admin UI — loader migration is W3, out of scope here).

1. **`updateItemImages`** (`src/lib/admin/items.functions.ts`)
   - Snapshot fields: `updated_at, images, images_meta`
   - Action: `"update_images"`
   - Input gains: `expectedUpdatedAt: string`

2. **`setCardBackground`** (same file)
   - Snapshot fields: `updated_at, card_background_url`
   - Action: `"set_card_background"`
   - Input gains: `expectedUpdatedAt: string`

3. **`uploadItemImage`** (same file — the post-storage-upload DB write)
   - Snapshot fields: `updated_at, images`
   - Action: `"upload_image"`
   - Metadata: `{ storage_path, bucket }` for forensics
   - Input gains: `expectedUpdatedAt: string` (the array append needs the stale check too — concurrent uploads otherwise lose one)

4. **`toggleItemVisibility`** (same file)
   - Snapshot fields: `updated_at, status, public_ready`
   - Action: `"toggle_visibility"`
   - Input gains: `expectedUpdatedAt: string`

### Client-side plumbing

Each admin form/mutation site that calls these four functions needs to pass `expectedUpdatedAt` from the row it loaded. Minimal touch:
- `/admin/image-qa` row actions → already have `item.updated_at` in scope
- `/admin/items/[id]` edit page → already have it
- Card background picker → already in scope

If a 409 STALE is thrown, the client mutation handler shows a toast (`"Someone else edited this. Refresh and try again."`) and calls `queryClient.invalidateQueries({ queryKey: [...] })` to pull the fresh row. No auto-merge — explicit reload only. This is the safe boring choice.

### Small helper

Add a tiny `pick(obj, keys)` util to `src/lib/utils.ts` (or inline if it already exists) so the `before`/`after` snapshots stay narrow — never dump the whole row into the audit log. Keeps `admin_audit_log` rows small and forensically focused.

### Acceptance

- All four handlers read-once, check `expectedUpdatedAt`, then write, then audit
- Stale write returns 409 with `STALE` code (Error-wrapped for now, AppError later)
- `admin_audit_log` gets one row per successful mutation with `before`/`after` containing ONLY mutated fields
- Audit failure logs to console but never cancels the mutation (already done in W1.1 helper)
- Smoke test: open same item in two tabs, edit in tab A, try to edit in tab B → tab B shows stale toast + reloads
- `select * from admin_audit_log order by at desc limit 10` shows the last 10 mutations with sensible diffs

### Out of scope (deferred)

- `AppError` class + `safeHandler` wrapper → W2.2
- Loader migration for admin routes → W3
- Vitest coverage of audit writes + 409 path → W1.4 (same PR, next step after handler wiring)
- Inquiry/style_board mutations → W4 (they need different snapshot shapes)

When the four handlers + client plumbing are in, I'll surface the diff for review before starting W1.3 (`rate_limits` + pg_cron).
