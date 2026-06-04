## Two tracks, in order

**Track A: Studio production-ready (ship this week).** Five concrete fixes from the audit. Nothing else in Studio.

**Track B: Admin consolidation to single `/admin` page.** Keep what's actually used; cut the rest from the nav.

---

## Track A — Studio fixes

### A1. Show client's uploaded inspo to admin on first open ⚠ blocker
`src/hooks/use-style-board.ts:89–115` — when board is null, also read `workspace.inquiry.metadata.inspo_paths`, sign them via `getInspoSignedUrls`, seed `inspoImages`. Right now admin opens a fresh inquiry and sees zero images even though the client uploaded up to 8.

### A2. Email admin on new submission
`src/lib/style-brief.functions.ts` — after `inquiries.insert`, send notification to staff inbox with: client name, email, link to `/admin?tab=studio&inquiry=<id>`, brief summary.

### A3. Email client with share link when admin sends
`src/lib/studio.functions.ts` `markBoardSent` — after setting `share_token`, send email to client (look up `inquiries.email` by `inquiry_id`) with link to `/studio/<token>` and a one-line message.

Both A2/A3 need an email provider. Resend is the simplest. Adds one secret (`RESEND_API_KEY`) and one server helper (`src/lib/email.server.ts`). Templates kept minimal — no marketing chrome.

### A4. View count select bug
`src/lib/studio.functions.ts:272` — add `client_view_count` to the select clause. Currently it's never read, so increment always becomes `1`.

### A5. Admin upload header
`src/hooks/use-style-board.ts:147` — change `x-upsert: "true"` to `"false"`. Match the public flow's hardening.

### A6. Render tones + insights on client board
`src/routes/studio.$token.tsx` — the API returns `tones` and `insights` but the page doesn't render them. Add a compact section between palette and inspo.

**Skipped on purpose:** "ready" status (dead code, leave it), `/studio/lab` polish, 3D viewer changes.

---

## Track B — Admin consolidation

### Audit of current 6 routes
| Route | Lines | Verdict |
|---|---|---|
| `/admin` (dashboard) | 517 | Keep — overview |
| `/admin/insights` (inquiries) | 555 | Keep — primary inbox |
| `/admin/studio` (style boards) | 376 | Keep — ships this week |
| `/admin/image-health` | 467 | Keep — periodic check |
| `/admin/image-qa` | 270 | Cut from nav — image migration complete (per memory, 2026-05-07) |
| `/admin/colors` | 350 | Cut from nav — one-time tagging tool, done |
| `/admin/incoming` | 261 | Cut from nav — one-time photo intake, done |

Cut tools are kept as route files (don't remove yet — flag-only per project memory rule) but removed from the sidebar. Reachable by typing the URL if ever needed again.

### Single-page `/admin` structure
URL stays `/admin`. Sidebar replaced with tab strip across the top. Tab state in URL search param (`?tab=inbox|studio|inventory&inquiry=<id>`) so deep links and refreshes work.

```
/admin
├─ Tab: Inbox (default)        ← merges current dashboard + insights
│   • KPI strip (total inquiries, new this week, open boards)
│   • Inquiries table with status badges, search, click → opens Studio tab with inquiry preselected
├─ Tab: Studio                 ← current admin.studio workspace
│   • List view (no ?inquiry) or workspace view (with ?inquiry)
│   • Same components: StudioBrowser, StyleBoardCanvas, tabs
├─ Tab: Inventory              ← current image-health, simplified
│   • Coverage % + categories at a glance
│   • Link to /admin/image-health for the deep view
```

Old `/admin/insights`, `/admin/studio`, `/admin/image-health` redirect to `/admin?tab=...` so any existing bookmarks still resolve.

### What gets built
- New: `src/components/admin/AdminTabs.tsx` — top tab strip, URL-synced.
- Refactor: `src/routes/admin.tsx` becomes the single container, reads `?tab=`, renders one of three panels.
- Lift: existing `admin.insights.tsx` and `admin.studio.tsx` content into panel components (`src/components/admin/panels/InboxPanel.tsx`, `StudioPanel.tsx`, `InventoryPanel.tsx`). Logic unchanged, just relocated.
- Retire from nav: drop the Image QA / Colors / Incoming entries from `admin-shell.tsx`. The shell itself goes away (replaced by `AdminTabs`).
- Redirects: convert `/admin/insights`, `/admin/studio`, `/admin/image-health` route files to small redirect components.

---

## Order of work
1. A1, A4, A5, A6 (small surgical fixes, no new deps) — 1 batch.
2. A2 + A3 (email) — needs `RESEND_API_KEY` from you.
3. Track B (admin consolidation) — last, after Studio is verified working.

---

## What I need from you before starting
- **Email provider:** Resend is the recommendation (free tier covers this volume, one secret, 5-line server helper). If you have a different one already, say so.
- **Admin notification email:** which inbox should new submissions go to?
- **Client email sender:** what `from:` address? (Resend needs a verified domain — `eclectichive.com` will work once verified.)

Nothing built until you confirm.