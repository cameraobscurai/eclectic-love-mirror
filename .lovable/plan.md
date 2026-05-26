# Hardening Plan v3   
  
 v3 is tight.

v3 is tight. The gaps are closed cleanly and the Lovable/Cloudflare corrections are important — a plan that assumed Vercel/Node would've caused real friction at deploy time.

A few final observations before you flip to build mode:

**The email resilience pattern is right, but verify the audit call signature**

In the `email_failed` audit call you're passing `metadata` as a top-level field but the `audit()` helper from W1.1 doesn't have a `metadata` param in its args type — it reads IP/UA from request headers internally. You'd either need to add an optional `metadata` override to the helper, or log the failure a different way. Small thing, but it'll be a type error on day one of W4.

**The "no BaseLayout" rule is good but needs a home**

The hard boundary on email components ("say no until there's a third") is the right call, but it only works if it's written down somewhere the next developer will see it. A one-line comment at the top of `BoardReady.tsx` — `// Do not extract a shared layout until a third email type ships` — is enough. Otherwise it gets "cleaned up" within a month.

**Smoke send acceptance criteria needs one more condition**

"Spam folder counts as fail" is correct, but SPF/DKIM being wired is a Resend + DNS config step that's easy to forget until the day of the send. That's worth explicitly adding to the W4 pre-checklist as "verify SPF/DKIM records set for `eclectichive.com` in Resend dashboard" — not a code task, but it'll block the smoke send if it's not done.

**Everything else is solid.** The security comment on the RLS policy is exactly the right move — that's the kind of thing that saves a future audit from going sideways. The `:17` cron offset is a nice detail that shows this was thought through rather than copied.

Ready to build. Start with the `admin_audit_log` migration.

Three gaps closed: rate_limits self-cleanup, renderBoardEmail scoped, secrets pattern documented. Resend path corrected to use Lovable's connector gateway (no raw API key in this project).

Pipeline + sequencing from v2 stand. Only deltas below.

---

## DELTA 1 — rate_limits self-cleanup (W1.3)

Append to the W1.3 migration so it doesn't quietly grow:

```sql
-- existing rate_limits table from v2 plan...

-- Self-cleanup: drop windows older than 24h, hourly.
-- pg_cron is already enabled in this project (email queue uses it).
select cron.schedule(
  'rate_limits_cleanup',
  '17 * * * *',                                  -- :17 every hour, off-peak
  $$ delete from public.rate_limits
     where window_start < now() - interval '24 hours' $$
);
```

Why `:17` not `:00`: avoids piling onto the email queue cron that runs every 5s and other jobs that tend to cluster at the top of the hour.

Verify after migration:

```sql
select jobid, schedule, command from cron.job where jobname = 'rate_limits_cleanup';
```

---

## DELTA 2 — `renderBoardEmail` scoped explicitly (W4.3)

Single-file React Email component, no shared layout, no MJML. Lives at `src/lib/emails/BoardReady.tsx`. Cap: ~80 lines.

```tsx
// src/lib/emails/BoardReady.tsx
import { Html, Head, Body, Container, Heading, Text, Button, Hr } from "@react-email/components";

interface Props {
  clientName: string;
  curatorName: string;
  url: string;
  expiresAt: string;  // ISO
}

export function BoardReady({ clientName, curatorName, url, expiresAt }: Props) {
  const expiry = new Date(expiresAt).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "Georgia, serif", background: "#ffffff", color: "#1a1a1a", margin: 0, padding: "48px 0" }}>
        <Container style={{ maxWidth: 520, margin: "0 auto", padding: "0 24px" }}>
          <Text style={{ fontSize: 11, letterSpacing: "0.24em", textTransform: "uppercase", color: "#1a1a1a99" }}>
            Eclectic Hive — Studio
          </Text>
          <Heading as="h1" style={{ fontSize: 28, lineHeight: 1.1, margin: "16px 0 24px", fontWeight: 400 }}>
            {clientName}, your style board is ready.
          </Heading>
          <Text style={{ fontSize: 14, lineHeight: 1.6, color: "#1a1a1aCC" }}>
            {curatorName} put this together for you. Pieces, inspiration,
            color direction — all in one place. React to anything you love
            or want to set aside.
          </Text>
          <Button href={url} style={{
            display: "inline-block", marginTop: 24,
            background: "#1a1a1a", color: "#ffffff",
            padding: "14px 28px", fontSize: 11, letterSpacing: "0.22em",
            textTransform: "uppercase", textDecoration: "none",
          }}>
            View your board
          </Button>
          <Hr style={{ borderColor: "#1a1a1a1A", margin: "40px 0 20px" }} />
          <Text style={{ fontSize: 11, color: "#1a1a1a80", letterSpacing: "0.06em" }}>
            Link expires {expiry}. If you need a new one, reply to this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

Server-side render at call time:

```ts
import { render } from "@react-email/render";
const html = await render(<BoardReady {...props} />);
```

Hard boundary: any future board email reuses this file or gets a sibling. No `<BaseLayout>`, no shared header component. When the second email type ships and there's pressure to extract — say no until there's a third.

Deps to add (W4 only): `@react-email/components`, `@react-email/render`.

---

## DELTA 3 — Resend path corrected + secrets flow (W4.3)

This project has no `RESEND_API_KEY` runtime secret. Lovable's connector gateway handles Resend auth — the project only needs `LOVABLE_API_KEY` (already present) + a Resend connector connection. Cleaner than direct API: no key rotation in our codebase, no per-env secret to sync.

**Final send call**:

```ts
// inside markBoardSent handler, after token write + audit
const html = await render(<BoardReady {...emailProps} />);

const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
    "X-Connection-Api-Key": process.env.RESEND_CONNECTION_KEY!,  // set by the connector
  },
  body: JSON.stringify({
    from: "Eclectic Hive Studio <studio@eclectichive.com>",
    to: [clientEmail],
    subject: `${clientName}, your style board is ready`,
    html,
  }),
});
if (!res.ok) {
  // Don't fail the whole mutation — board is sent, email is best-effort.
  // Audit as 'email_failed' so it surfaces in the admin.
  await audit({ actorId, entity: "style_boards", entityId: board.id,
                action: "email_failed", metadata: { status: res.status } });
}
```

**Secrets flow (one place, no per-env juggling)**:

- Lovable Cloud is the single source of truth for runtime secrets. Set/rotated via `secrets--add_secret` and surfaced as `process.env.*` only inside server fns / server routes.
- No `.env.local` for production keys. `.env` is auto-generated for the Supabase publishable values only.
- No Vercel — this project deploys on Cloudflare workerd via Lovable's pipeline. Anything assuming Node/Vercel patterns is wrong for this stack.

**W4.3 acceptance addition**:

- Resend connector connected via Connectors panel before W4.3 ships.
- `markBoardSent` resilient to email failure (audit row, no throw).
- One end-to-end smoke send to a real address before marking W4 done.

If the user later wants to swap connectors for direct Resend API (e.g. for marketing volume), that's a one-function refactor — keep all email send code inside `markBoardSent` and any future `sendStudioEmail` helpers, never inline at call sites.

---

## Updated W4 acceptance (replaces v2's)

- Share links expire/revoke/rotate, gates verified by test from W1.4 expanded to cover all three states.
- Reactions land in DB and surface in admin in <1s via realtime.
- `markBoardSent` enqueues + sends via Resend connector, returns `{ok:true}` even on email failure, and writes `email_sent` or `email_failed` to audit log.
- One real-address smoke send confirmed in inbox (spam folder counts as fail — that means SPF/DKIM not wired).

---

## Comment to add to the RLS policy (W4.2)

You called out the substitutability question. Add this above the policy at migration time so it survives future "cleanup" passes:

```sql
-- SECURITY NOTE: anon INSERT here is safe because:
-- 1. Client never types a board_id; the value is fetched server-side from
--    /studio/$token via getStyleBoardByToken, which enforces token + expiry + revoke.
-- 2. The policy's EXISTS clause double-gates on sent + non-revoked + non-expired.
-- 3. The reaction enum is whitelisted; note is length-capped.
-- DO NOT widen this policy. DO NOT replace the EXISTS subquery with a simpler check.
create policy "react via token" on public.style_board_reactions ...
```

---

## What changes about starting today

You said start W1.1 + W1.2 in parallel — agreed, both additive, no overlap. Order within the day:

1. Migration: `admin_audit_log` table + RLS (W1.1) — single transaction.
2. Migration: add `expectedUpdatedAt` plumbing — pure code, no schema change for `updateItemImages` (already has length check, just swap to timestamp). `style_boards` + `inquiries` + `inventory_items` mutations get the same pattern.
3. Both audit helper writes + concurrency rejections covered by the same vitest suite from W1.4.

When you flip me to build mode I'll start with the audit_log migration as the only schema change in that PR, then the helper file, then wire it into the 4 hot handlers, then the vitest baseline. One PR, fully reversible (drop the table, drop the imports — everything else still works because audit is fire-and-forget).