## Two things, scoped tight

### 1. Photo archive — right-sized, not overdone

**What it is:** A private `inventory-photo-archive` bucket that holds a copy of every owner-uploaded original. If `incoming-photos/` ever gets wiped or a row's `images[]` gets clobbered, the original PNG still exists somewhere safe.

**What it is NOT:** Not a full Supabase backup. Not versioned history. Not nightly DB dumps. One copy per file, write-once, never deleted by app code.

**Scope (3 pieces):**

| Piece | Lift | What it does |
|---|---|---|
| New private bucket `inventory-photo-archive` | migration | Service-role write, no public read, no client access |
| One-time backfill `scripts/archive-backfill.mjs` | ~30 min, ~2 GB copy | Mirrors every file currently in `incoming-photos/` + `inventory/` into the archive. Skips files already there. Idempotent — safe to re-run |
| `/admin/incoming` upload hook | tiny edit | After a successful upload, fire-and-forget copy to archive. If archive write fails, log it — never block the primary upload |

**What we are NOT doing:**
- ❌ Nightly DB JSON snapshots (skipped per your call — Supabase already does daily PITR backups on its side)
- ❌ Storage object manifest job
- ❌ Mirroring `squarespace-mirror/` (we can re-harvest from her live site; not original-source material)
- ❌ Mirroring legacy buckets (`tablewear`, `glassware`, `midas`, etc.) — superseded, will retire
- ❌ Restore UI — if we ever need to restore, it's a manual script run, not a feature

**Cost:** ~2 GB doubled. Pennies per month.

**Recovery story:** If row 2894's images get blown away, owner pings me. I run `scripts/archive-restore.mjs --rms-id 2894` which finds files in archive by filename pattern and re-uploads to `incoming-photos`. Manual, but the bytes never went away.

---

### 2. Owner hide toggle on `/admin/incoming`

**What it does:** Owner can hide any tile from the public catalog without my help. Already works in the DB — `public_ready=false` now actually drops the tile on next bake (fixed this turn). Just needs a UI.

**Scope:**

| Piece | Lift | What it does |
|---|---|---|
| Eye/eye-off button on each tile in `/admin/incoming` | small | Click toggles `inventory_items.public_ready`. Hidden tiles show dimmed with "HIDDEN" badge |
| Optional `hidden_note` text input | tiny | Owner can record why ("damaged", "sold", "needs reshoot"). Column already exists |
| "Rebake catalog" button at top of page | small | Calls a server fn that runs the bake. Without this, hide changes don't show on the live site until I run the script |

**Server fn:**
- `toggleItemVisibility({ id, publicReady, hiddenNote? })` — admin-only via `requireSupabaseAuth` + `has_role(admin)`
- `rebakeCatalog()` — admin-only, runs the same logic as `scripts/bake-catalog.mjs`, writes the JSON back to disk. **CAVEAT:** server can't write to the repo on Cloudflare Workers. Two options:
  - **(a) Simpler:** rebake writes to a `inventory_catalog_snapshots` table; catalog accessor reads latest row. Removes the static-file step entirely. Owner click = instant publish.
  - **(b) Defer:** skip the rebake button this round. I run bake manually when she pings me. Toggle still works in DB.

**Recommendation:** Ship hide toggle + hidden_note now (option b). Defer the rebake button until we decide between snapshot-in-DB vs keep-static-file. The toggle has value even if I'm the one rebaking.

---

## Order
1. Migration: create `inventory-photo-archive` bucket + admin-only RLS
2. Run `archive-backfill.mjs` (one-shot, scriptable, ~30 min wall time)
3. Wire upload hook in `/admin/incoming`
4. Add hide toggle + hidden_note input to `/admin/incoming`

## Risk
- Bucket is private, no public surface — can't accidentally expose anything
- Backfill is read-from-source + write-to-archive only, never touches source
- Hide toggle is reversible per-row, no bulk operation
- Rebake question is deferred — no decision needed today
