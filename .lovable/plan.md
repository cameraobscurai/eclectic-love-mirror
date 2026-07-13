
# Verify-first sequence, then ship reliability PRs one at a time

Adopting your reclassification and PR order verbatim. No batched mega-PR. No memory rewrites until PR 0 evidence lands.

---

## PR 0 — Verification & observability (READ-ONLY, first)

Goal: prove or disprove the two P0 hypotheses before any edit.

**Email queue evidence**
- Query `cron.job` for jobs whose command references `email_queue_dispatch`, `enqueue_email`, `transactional_emails`, or `process-email-queue`. Record jobid/schedule/active.
- Query `cron.job_run_details` last 20 runs of matched jobs — prove they execute, not just exist.
- Snapshot `pgmq.q_transactional_emails` and `pgmq.q_auth_emails`: depth + oldest `enqueued_at`.
- `email_send_log` last 7d, deduped by `message_id`: status counts, oldest `pending` age, error samples.
- Document the on-demand scheduling contract already visible in `email_queue_wake` + `email_queue_dispatch` — an empty `cron.job` with empty queues is healthy; only "cron missing while queue has pending rows" is a real failure.
- Fire one live inquiry through `/contact` and trace it: DB row → queue → `sent` in `email_send_log` → inbox.

**Share-token evidence**
- Read `generateShareToken` and every call site in `src/lib/studio.functions.ts`.
- Read `style_boards` schema: is the token stored raw, hashed, or both? expiry column? revoked column? scope column? read/write split?
- Grep for the token in `console.log`, `console.error`, telemetry.
- Check whether `/stylebrief/$token` sets `Referrer-Policy: no-referrer` (currently it doesn't — meta only sets robots).
- Score against your 11-point checklist. Report gaps.

**Deliverable**: verification report with cron status (evidence rows), token checklist (pass/fail per item), queue depth snapshot, and a corrected fix-queue in memory. No code edits.

---

## PR 1 — Mutation reliability

Only after PR 0. Establish one pattern, migrate the four confirmed sites.

- New helper `src/lib/admin/useAdminMutation.ts` on top of TanStack Query's `useMutation`:
  - guaranteed `finally` loading reset
  - in-flight guard (rejects duplicate submits)
  - forces `.select().single()` on updates so zero-row responses are visible
  - typed zero-row handling (`AffectedRows<T> = { rows: T[]; count: number }`)
  - `toast.error` with generic copy on failure, telemetry hook receives the real error
  - preserves form state on failure (caller keeps local state; helper never resets it)
- Migrate:
  - `admin.insights.tsx` `save()` — currently no try/catch.
  - `admin.colors.tsx` save callbacks — errors swallowed as unhandled rejections.
  - `clearColorTag` — return `ClearColorResult = { status: "cleared" | "locked" | "not_found" }`; UI shows "This color is locked. Unlock it before clearing the tag." on `locked`.
  - `generateBoardCopy` — surface failure with retry, not silent null + `console.error`.
- One Vitest integration test per site that forces a Supabase error and asserts (a) toast fires, (b) form values persist, (c) loading state resets.

---

## PR 2 — Email durability (scope contingent on PR 0)

- If cron is only "dynamically applied" and not in migration history: add a migration that owns the schedule as source of truth. Keep the on-demand wake/dispatch trigger — the migration is the durable fallback.
- Audit retry policy in the queue worker route: 5-attempt DLQ move, auth 15min TTL, transactional 60min TTL — confirm each is actually enforced.
- Build `src/routes/admin.emails.tsx` (admin-gated) with: pending depth, oldest pending age, DLQ count, last successful drain, per-message retry count, filters per email dashboard guide (dedupe by `message_id`).
- Add HMAC signature verification test for `/lovable/email/suppression`.
- E2E: force one Mailgun 5xx and observe retry → DLQ → dashboard reflects it.

---

## PR 3 — Share-link hardening (scope contingent on PR 0)

Migration (single, forward-only):
- Add `token_hash` (sha256 hex, unique), `token_expires_at`, `revoked_at`, `permissions` enum (`view` | `edit`) to `style_boards`.
- Backfill `token_hash` from existing raw `share_token`; then drop raw column in a follow-up migration once code no longer reads it.

Code:
- Replace generator with `randomBytes(32).toString("base64url")` + sha256 hash-at-rest.
- Update `getStyleBoardByToken` to hash-then-compare.
- Per-IP + per-token-fingerprint rate limit on the share route.
- `Referrer-Policy: no-referrer` header on `/stylebrief/*` responses.
- Strip token from all `console.error` / telemetry — replace with `token_hash.slice(0,8)`.
- Signed asset URLs for any private-bucket images the board renders.
- Optional read/write split if PR 0 shows edit access flows through the same token.

---

## PR 4 — Public forms & Stylebrief

- `contact.tsx` honeypot: rename field away from `email/phone/website/company` (e.g. `form_confirmation_note`), add offscreen positioning + `aria-hidden` + `tabIndex={-1}` + `autoComplete="off"`. Keep fake-success response for tripped submissions. Log rejections with reason to a new `form_rejections` table for false-positive review. Add simple time-to-submit floor (bot fills in <1s) + server-side per-IP rate limit.
- `InspoDropZone.tsx`: replace clickable `<div>` with `<label>` wrapping the visually-hidden `<input type="file">`. Add `aria-describedby`, visible keyboard focus ring, drag-over state (kept), `aria-live` region for file-type/size errors and progress.
- `stylebrief.tsx` / `stylebrief.$token.tsx` head: add canonical, `og:url`, real `og:image` (brand static cover before submit; leaf token page stays noindex).

---

## PR 5 — Perf & admin consistency

- `SequentialHeroVideo` + `HeroFilmstrip`: drop the `setTimeout(tryPlay, 250)` retry; single autoplay attempt; keep poster as LCP; add `prefers-reduced-motion` + `navigator.connection.saveData` + `effectiveType` (`slow-2g`/`2g`) gates; IntersectionObserver so video only loads near viewport; `preload="metadata"` on mobile. Fall back to poster-only when playback rejects.
- `src/components/admin/ConfirmOrUndo.tsx` — one abstraction:
  - `undo` mode: 30s toast, reversible actions (archive, clear tag, reorder, status changes).
  - `confirm` mode: modal, destructive/irreversible (permanent delete, token revoke, bulk actions >N rows).
  Replace all `window.confirm` and route-local undo implementations.
- `admin.admin` chat: env-flagged behind `VITE_ADMIN_CHAT_ENABLED` so incomplete "Phase 1" copy stops shipping.
- `generateBoardCopy` failure UX handled here alongside admin pattern (works with PR 1's `useAdminMutation`).

---

## PR 6 — Cleanup (conservative)

For each orphan route (`chairs-stools1.$.tsx`, `large-decor1.$.tsx`, `lighting1.*`, `tables1.$.tsx`, `seating1.$.tsx`, `gallery-1.tsx`, `portfolio-1.tsx`, `colorado-1.tsx`, `the-hive3.tsx`, `cohome.tsx`):
1. Pull last 30d prod request logs per path.
2. Check `sitemap.xml` + any generated manifests.
3. Ripgrep repo (src, scripts, supabase, remotion) for the path string.
4. Identify canonical replacement.
5. Ship 301 redirect first.
6. Monitor 404s one release.
7. Only then remove the route file.

Orphan components / assets get the same manifest-first treatment — never `rm` without ripgrep across all namespaces.

Migrations:
- Leave all historical applied migrations intact, including the two `20260713*` duplicates. Add `supabase/migrations/README.md` documenting the duplicate and why editing history is off-limits.
- Squashed baseline is a separate future workstream for new-environment bootstrap only.

---

## Execution order

1. **This turn (once build mode is on)**: PR 0 only — read-only SQL + code reads, verification report. No writes.
2. **Next**: PR 1 mutation reliability, ships regardless of PR 0 outcome.
3. **Then, based on PR 0 findings**: whichever of PR 2 / PR 3 verification proved urgent, one at a time.
4. PR 4 → 5 → 6.

## Technical notes

- All PR 0 SQL runs through `supabase--read_query`. Zero `INSERT/UPDATE/DELETE`.
- The existing `email_queue_dispatch` + `email_queue_wake` (visible in db functions dump) already implement on-demand scheduling. PR 0 must distinguish "no cron because queues drained" (expected) from "no cron while queue has pending rows" (real bug).
- Memory (`mem://audits/2026-07-07-fix-queue.md` + core index) gets rewritten from PR 0 evidence, not from this audit narrative.
- No changes to `src/integrations/supabase/client.ts`, `.env`, `types.ts`, or `routeTree.gen.ts` in any PR — those are auto-managed.
