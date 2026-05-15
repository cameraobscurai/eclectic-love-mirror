
# Studio baseline — minimum viable loop

Goal: a curator can open an inquiry, build a board, hit **Send**, get a shareable link, and the client can view it. That's it. No email, no comments, no versioning. Earn the tab once this works.

## Steps

**1. DB migration on `style_boards`**
- `share_token text unique` (nullable; set on first Send)
- `sent_at timestamptz`
- `pin_notes jsonb default '{}'` — `{ rms_id: "one-line why" }`
- `client_view_count int default 0`, `last_viewed_at timestamptz`
- Public RLS: `SELECT` allowed when `share_token IS NOT NULL AND status = 'sent'` (token acts as the secret; row only readable when sent)

**2. Server functions** (`src/server/studio.functions.ts`)
- `markBoardSent({ boardId })` — admin-only; generates `share_token` (crypto.randomUUID), sets `status='sent'`, `sent_at=now()`. Idempotent — reuses token if already set.
- `getStyleBoardByToken({ token })` — **public, no auth**. Returns board + inquiry name only (no email/message). Increments `client_view_count`. Hydrates inspo signed URLs + resolves pinned rms_ids against catalog server-side.
- Extend `saveStyleBoard` to persist `pin_notes`.
- Add `listStudioBoards()` — admin-only; recent boards by status for the index view.

**3. Admin index view** (`/admin/studio` with no `?inquiry=`)
Replace the current "No inquiry selected" stub with a list: recent boards grouped by status (draft / ready / sent), each row → name, inquiry subject, updated_at, link to workspace.

**4. Per-pin notes in workspace**
Add a one-line note input under each pinned tile in the left rail. Wire to `state.pinNotes[rmsId]`, mark dirty, save with the rest.

**5. Send action**
Replace "Mark ready" with **Send**. On click: save first, call `markBoardSent`, show the resulting `/studio/{token}` URL with a copy button. Status badge becomes `sent`.

**6. Public client view** (`/studio/$token.tsx`)
- New top-level route (NOT under `/api/public`, this is a user-facing page)
- `loader` calls `getStyleBoardByToken`
- Layout: hero with client name + curator note, palette strip, then a single editorial grid of inspo + pinned pieces (each piece shows its pin_note as caption)
- `head()` with `noindex, nofollow` (token is the only auth)
- No actions yet — read-only

**7. Keep it out of nav**
Don't touch `admin-shell` nav. Studio remains URL-only access until the loop feels good.

## Out of scope (deliberately)
- Email send (manual link copy is fine for v1)
- Client reply / approve flow
- Versioning / snapshots on send
- Quantity carry-through from inquiry
- PDF export

## Technical notes
- Public read uses anon Supabase via `supabaseAdmin` inside the server fn — RLS policy is the backstop, but the fn projects only safe columns.
- View-count update happens server-side post-fetch; failure is non-fatal.
- Token is a UUID v4 — sufficient entropy for an unguessable share link.
