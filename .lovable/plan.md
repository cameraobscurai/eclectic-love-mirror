
# Make `/admin` staff-ready

Goal: turn the dashboard from a read-only reporting view into a tool the staff (you + Jenna) can actually *work* in for an hour at a time without friction.

Scope is UI/UX only. Auth, RLS, and security are out of scope here (covered separately).

---

## 1. Shared admin shell

Right now every sub-route (`/admin`, `/admin/insights`, `/admin/colors`, `/admin/image-qa`, `/admin/image-health`) re-implements its own header + nav. Staff get lost because there's no consistent "where am I / how do I get back."

Build a single shell rendered in `admin.tsx` (parent layout) that wraps `<Outlet />`:

- **Left rail (collapsible icon sidebar)** — uses shadcn `Sidebar`, grouped:
  - *Overview*: Dashboard
  - *Inbox*: Inquiries (badge with open count)
  - *Inventory*: Insights, Image Health, Image QA, Color QA, Bind (placeholder)
  - *Site*: View live site, Collection, Contact (external links, open in new tab)
- **Top bar** — breadcrumb (Admin › Inquiries › #42), `SidebarTrigger`, Cmd+K hint chip, signed-in user avatar with logout, "View live site" link.
- **Editorial styling preserved** — keep Cormorant display headings, charcoal/cream palette, tracked uppercase eyebrows. The shell is structural, not decorative.

The dashboard, insights, color QA, etc. each lose their duplicated header and just render their content area.

## 2. Inquiry workflow (highest-value change)

The Inbox is currently read-only `<details>` accordions. Staff can't actually *do* anything. Add:

- **Status field** — extend `inquiries` with `status` (`new` | `in_progress` | `quoted` | `won` | `lost` | `archived`). Migrate existing `handled=true` → `won`, `handled=false` → `new`. Keep `handled` as a derived view for now.
- **Inbox list view** at `/admin/inquiries`:
  - Three-pane layout: left = filter rail, middle = list, right = detail pane (sticky)
  - Filter rail: status, date range, has-phone, search by name/email/message
  - List rows: name, email, subject, age ("2d"), status pill, unread dot
  - Keyboard nav: `j/k` row, `enter` open, `e` archive, `1–5` set status, `/` focus search, `esc` clear selection
- **Detail pane**: full message, contact info with click-to-copy, quick actions (Reply via mailto, Mark in_progress / quoted / won / lost, Archive, Add internal note)
- **Internal notes** — append-only `inquiry_notes` table (user_id, body, created_at). Shows author + timestamp on each note.
- **Optimistic status changes** with sonner toast + Undo (5s window), rollback on server error.

Dashboard's "Inbox" panel becomes a 5-row preview that links to `/admin/inquiries`.

## 3. URL state everywhere

Right now refresh = lose your place. Use TanStack Router `validateSearch` + zod adapter on every list view (`/admin/inquiries`, `/admin/colors`, `/admin/image-qa`, `/admin/image-health`) for:

`?q=&status=&category=&sort=&page=&selected=`

`retainSearchParams(["q","status"])` on the admin parent so filters survive cross-page navigation. `stripSearchParams` for defaults so URLs stay clean.

Result: refresh, share URL, browser back — all do the right thing.

## 4. Command palette (Cmd+K / Ctrl+K)

Single keyboard surface, `cmdk` library + shadcn `Command`. Indexes:

- Every admin route
- All 14 categories (jump to Collection filter)
- Recent inquiries (last 20, by name)
- Quick actions: "Mark all read", "Open today's inquiries", "Go to live site"
- Free-text product search across the 835-item baked catalog (already in memory client-side, no DB hit)

Dropdown groups, fuzzy match, recent + pinned commands at top. This is the one feature that will change how the staff actually use the dashboard.

## 5. Feedback primitives

Standardize across every mutation:

- **sonner toasts** for every write — success with Undo when reversible, error with Retry button.
- **Optimistic updates** with rollback (status changes, image binds, color confirms).
- **Skeleton loaders** matching final layout — replace the "Loading inventory…" full-screen spinner. No layout shift.
- **Empty states** with one suggested next action ("No new inquiries · View handled →").
- **Inline error states** per panel — failed query shows "Couldn't load · Retry" inside the panel, doesn't blank the page.
- **Stale-data pill** — "Updated 2m ago · refresh" on inquiry/inventory cards. Auto-refresh every 60s on `/admin/inquiries`.

## 6. Bulk operations & dry-run discipline

Memory rule: destructive ops must be dry-run → review → apply. Build a reusable `<BulkActionBar>` component:

- Sticks to bottom when 1+ row selected
- Shows selection count, action buttons, "Clear selection"
- Destructive actions open a `<DryRunDrawer>` from the right showing exactly what will change ("137 items will get new image URLs · 12 will be deleted · 3 conflicts") before the Apply button enables.
- Truly irreversible actions require typing a confirmation phrase.

Apply this pattern to: image-bind (existing flow), bulk inquiry status change, bulk color confirm.

## 7. Saved views

Each list route supports saving the current filter+sort combination as a named view, stored in localStorage keyed per-user. Pinned views appear in the sidebar under each section:

- Inquiries → "My open · This week · Quoted, awaiting reply"
- Image Health → "Missing images · Fuzzy matches · No dimensions"
- Color QA → "Needs review · Low confidence"

## 8. Activity feed

Sidebar footer card showing last 10 admin actions across all users:

> Jenna marked Inquiry #42 as quoted · 3m ago
> Darian confirmed colors on 8 items · 1h ago

Backed by an `admin_activity` table written from server functions. Two-line item, click to jump to the affected row.

## 9. Detail polish (the small stuff that adds up)

- Tabular numbers everywhere counts/dates appear (you do this in some places, not others)
- Click-to-copy on every email/phone/RMS-id with check-mark feedback
- Relative timestamps with absolute on hover (`title="2026-05-08 14:12"`)
- Density toggle: comfortable / compact (compact = 32px row height for power use)
- Persistent dark-mode toggle (admin only, doesn't affect public site)
- `?print=1` mode that strips chrome for clean PDF exports of inquiries/reports

---

## Implementation order

The list above is the full picture. Recommend shipping in this order so staff get value fast:

1. **Shell + sidebar + breadcrumbs** (1 PR) — visible structural change, no DB work
2. **Inquiry workflow + status field migration** (1 PR) — actual workflow unlock
3. **URL state + skeletons + toasts + empty/error states** (1 PR) — feel-of-quality pass
4. **Cmd+K palette** (1 PR) — power-user multiplier
5. **Bulk action bar + dry-run drawer** (1 PR) — safety net for destructive ops
6. **Saved views + activity feed + detail polish** (1 PR) — long-tail UX

Stops 1–3 are the minimum to call this "staff-ready." 4–6 are what makes it feel premium.

---

## Technical notes

- Sidebar: shadcn `Sidebar` with `collapsible="icon"` so it can shrink to 56px rail.
- Search params: `@tanstack/zod-adapter` `fallback()` (not zod `.catch()`) for type safety.
- Optimistic updates: TanStack Query (already in deps) `useMutation` with `onMutate` / `onError` rollback.
- Command palette: `cmdk` (shadcn `Command` already wraps it).
- Activity feed: small `admin_activity` table, RLS = admin-only read, server-fn-only write.
- All new server fns go through `requireSupabaseAuth` + admin role check (per existing `admin-middleware` pattern).
- No changes to public site routes, design tokens, or the Squarespace/RMS pipelines.
