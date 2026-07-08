# Style Brief / Board — Surgical Fix Plan

Ground rules (non-negotiable):
- No design/layout changes. No refactors. No "while I'm in here" edits.
- One phase per PR-sized migration/commit. Each phase independently revertible.
- Every phase ends with a Playwright + DB verification against the exact symptom it claims to fix. No "should work" — prove it.
- No touching `src/integrations/supabase/*` auto-gen, no schema drops, no bucket policy changes beyond what a phase explicitly requires.

---

## The 5 real defects (ranked by user-visible impact)

| # | Symptom the client sees | Root cause | File:line |
|---|---|---|---|
| 1 | Inspo images 404 the day after the share link is opened | `createSignedUrls(paths, 60*60*24)` — 24h TTL baked into the share page | `src/lib/studio.functions.ts:686` |
| 2 | Public deck "mood hero" shows furniture instead of client's inspiration | `board.inspo.length >= 3` silent fallback to pinned inventory | `src/lib/board-deck.ts:151` |
| 3 | Pinned tile shows `[object Object]` on public deck | `images` treated as `string[]` without the same `typeof === "string"` guard the email path uses | `src/lib/studio.functions.ts:705` |
| 4 | Visitor uploads a HEIC from iPhone → submit throws mid-loop → no visible error, form appears frozen | Client accepts `image/*`, server whitelists jpeg/png/webp/avif only, no user-facing error banner on the throw | `src/routes/stylebrief.index.tsx:140`, `src/lib/style-brief.functions.ts:17-23` |
| 5 | Board saved with empty palette when curator clicks Analyze → Send back-to-back | Stale-closure race: `send()` calls `save()` before `analyze()`'s `setState` has committed | `src/hooks/use-style-board.ts:246` |

Everything else in the earlier audit (admin-auth SSR no-op, hardcoded `eclectichive.com` in emails, loader swallowing errors, download-brief clobbering submit error) is real but not what she saw. Parked in Phase 6.

---

## Phase 0 — Reproduce & snapshot (no code changes)

Before touching anything, prove each defect exists on the current build.

1. Playwright script `scripts-tmp/repro-glitches.mjs`:
   - Load an existing share link → screenshot `phase0/1-share-day0.png`.
   - Fetch every `<img>` on the deck, log status codes → `phase0/deck-image-status.json`.
   - Attempt a HEIC upload on `/stylebrief` → capture console + screenshot.
   - Query a board with `inspo_images = []` and `pinned_rms_ids.length >= 3` → screenshot the mood hero.
2. DB snapshot: `select id, share_token, created_at, inspo_images, pinned_rms_ids, palette from public.style_boards order by created_at desc limit 20` → `scripts-tmp/phase0/boards.json`.
3. Commit the artifacts. These are the "before" evidence for each phase's verification.

Exit criteria: at least defects #1, #2, #3 reproduced with screenshots. #4 reproduced with a console throw. #5 reproduced by scripted analyze→send.

---

## Phase 1 — Defect #1: inspo image URLs (highest-impact)

Root cause: signed URLs expire; the share deck is meant to be a permanent artifact.

Fix (single file, single function):
- `src/lib/studio.functions.ts` `getPublicBoard` (~line 683):
  - Replace `createSignedUrls(paths, 60*60*24)` with a signed URL that outlives the retainer window. Options in order of preference:
    - **A (chosen):** sign for 7 days AND cache-bust re-sign on every `getPublicBoard` call — the loader hits this every share view, so URLs are always fresh for any active viewer. TTL = 7d gives a huge margin for email link previews and asynchronous opens.
    - B: move inspo to a public bucket with random path prefixes. Rejected — requires bucket policy change + migration of existing files.
- No signature change. No caller change. Same return shape.

Verification:
- Re-run Phase 0 Playwright against a real share link. All inspo `<img>` return 200.
- Advance clock: reload the share page 25h later (script uses `Date.now()` offset in a fetch — or just re-hit the loader; each hit re-signs). Confirm URLs regenerate.
- Diff the `getPublicBoard` return with the previous run — only `signed_url` values may differ.

Rollback: revert one line.

---

## Phase 2 — Defect #3: `[object Object]` on public deck

Root cause: `imgs[0]` blindly cast to string when `images` column contains mixed shapes for legacy rows.

Fix (same file as Phase 1, different function — do NOT combine PRs):
- `src/lib/studio.functions.ts` ~line 705:
  ```ts
  const first = (r.images as unknown[])?.[0];
  const image_url = typeof first === "string" ? first
    : (first && typeof first === "object" && "url" in first && typeof (first as {url:unknown}).url === "string")
      ? (first as {url:string}).url
      : null;
  ```
- Mirror the exact guard already used by the email path (per audit). One helper `pickFirstImageUrl(images)` in the same file, used by both call sites. No new file, no export.

Verification:
- SQL: `select id, images from inventory_items where jsonb_typeof(images->0) = 'object' limit 5` → snapshot 5 offending rows.
- Load a board that pins one of those rows via `getPublicBoard`. Assert `image_url` is a string URL or `null`, never `[object Object]`.
- Playwright the share deck → screenshot, diff against Phase 0.

Rollback: revert the helper + two call sites.

---

## Phase 3 — Defect #2: mood-hero silent fallback

Root cause: threshold too high; a client who uploads 1–2 inspo photos gets furniture instead.

Fix:
- `src/lib/board-deck.ts:151`: change `board.inspo.length >= 3` → `board.inspo.length >= 1`.
- Adjust `.slice(0, 3)` to `.slice(0, Math.min(3, board.inspo.length))` (already safe, but explicit).
- If 0 inspo → keep existing pinned-fallback path unchanged.

Verification:
- Build 3 test boards: 0 inspo, 1 inspo, 3 inspo. Render each via `board-deck` builder. Assert mood-hero page uses inspo when count ≥ 1, pinned when count = 0.
- Playwright screenshot each variant.

Rollback: revert one comparison.

---

## Phase 4 — Defect #4: HEIC silent failure

Two-part fix; both required.

**4a. Client-side hard reject** (`src/routes/stylebrief.index.tsx`):
- Change accept filter from `f.type.startsWith("image/")` to explicit `["image/jpeg","image/png","image/webp","image/avif"].includes(f.type)`.
- On reject, set a visible per-file toast/banner: `"HEIC/HEIF not supported yet — export as JPG from Photos → Share → Options → Most Compatible"`. Use the existing error surface already present in the component; do NOT introduce a new toast lib.
- Change the `<input accept="...">` to the same explicit list so iOS Photos picker offers Live Photo → JPG conversion when available.

**4b. Submit try/catch surfaces the throw** (`src/hooks/use-style-board.ts` or the submit handler in `stylebrief.index.tsx` — whichever owns the upload loop):
- Wrap the upload loop in `try/catch`; on catch set `submitError` state (already exists per audit) with the server's error message.

Verification:
- Playwright: pick a `.heic` file → assert banner appears, submit button stays enabled, no console throw.
- Pick a `.jpg` → submit succeeds end-to-end.
- Confirm the "download brief error overwriting submit error" bug from the audit is NOT re-introduced (Phase 6 handles that properly).

Rollback: revert accept-list + banner.

---

## Phase 5 — Defect #5: analyze→send race

Root cause: `send()` closes over stale `state.palette` because React hasn't flushed `setState` from `analyze()` yet.

Fix (`src/hooks/use-style-board.ts`):
- Change `analyze()` to return the computed `AnalysisResult` in addition to setting state.
- Change `save()` to accept an optional `overrides?: Partial<Pick<State, "palette"|"tones"|"insights">>` and prefer overrides over `state.*` when building the payload.
- Change `send()` to: `const fresh = await analyze(); const saved = await save(undefined, fresh); ...` — no longer relies on state flush ordering.
- Do NOT rewrite the reducer. Do NOT introduce a `useEffect` chain. Minimum viable change only.

Verification:
- Unit-level: script that calls `analyze()` then immediately `save()` and asserts the DB row has non-empty palette. Run 20× — 20/20 pass.
- Playwright: click Analyze → click Send within 100ms. Reload share link. Palette renders.

Rollback: revert the three function signatures.

---

## Phase 6 — Parked (owner-approval gated)

Do NOT bundle with 1–5. Each is its own future PR:
- Admin auth is client-side on SSR (`requireAdminOrRedirect` no-ops).
- `boardUrl` in emails hardcodes `eclectichive.com` — breaks preview + draft domain testing.
- `/stylebrief/$token` loader swallows Supabase errors as `notFound()` — masks real failures.
- `download-brief` error overwrites `submit-error` state.

---

## Execution order & gates

1. Phase 0 (reproduce) — **must show screenshots to user before Phase 1 ships.**
2. Phase 1 — ship, verify, wait for user OK.
3. Phase 2 — ship, verify.
4. Phase 3 — ship, verify.
5. Phase 4 — ship, verify.
6. Phase 5 — ship, verify.
7. Phase 6 — separate proposal, not this plan.

Between each phase: run the visual regression harness (`scripts/visual-regression/run.mjs`) on `/stylebrief`, `/studio/*`, and `/stylebrief/$token` share views. Zero unintended diffs. If any diff appears outside the phase's target, stop and revert.

## Non-negotiables (guardrails)

- No changes under `src/components/`, `src/routes/collection.tsx`, `src/lib/collection-*`, `src/styles.css`, or any auto-gen.
- No new dependencies.
- No schema changes. No policy changes. No new tables.
- Every DB read/write for verification goes through `supabase--read_query` — no ad-hoc `service_role` scripts outside `scripts-tmp/`.
- Total code footprint if all 5 phases ship: ~40 lines across 4 files. Anything larger means the plan drifted.
