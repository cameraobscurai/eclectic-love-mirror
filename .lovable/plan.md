## What's broken

**1. Visitor download — does not exist.**
`/stylebrief` shows a draft brief preview (`src/routes/stylebrief.index.tsx:605-632`) with palette, inspo, pinned pieces. There is **no download button**. The PDF exporter (`src/lib/board-export.ts`) is wired only to the admin-curated deck at `/stylebrief/$token` (`BoardDeck.tsx`), not the public submission.

**2. Staff email — palette and inspo missing.**
On submit, `submitStyleBrief` (`src/lib/style-brief.functions.ts`) writes palette / tones / insights / inspo_paths into `inquiries.metadata` (JSON). The admin notification email (`src/lib/email-templates/inquiry-notification.tsx`) renders only name, contact, date, budget, scope, vision text, and pinned item titles. **No swatches. No tones. No inspo images. No insights.** That data is in the DB but the email never reads it.

Same gap in `inquiry-confirmation.tsx` (client receipt).

---

## Plan

### A. Add visitor PDF download on `/stylebrief`
1. Tag the existing draft article (lines 605-632) with `data-board-page="1"` so `downloadDeckPDF()` can find it.
2. Add a "Download Your Brief" secondary button next to "Submit Brief". On click: call `downloadDeckPDF(articleRef.current, "eclectic-hive-brief-{name}.pdf")`.
3. Single-page letter-portrait PDF. Captures palette swatches + inspo thumbs + pinned strip + all details already on screen. Zero new layout.
4. Enable whenever palette OR pinned items OR inspo exist — even before submit.

### B. Pass palette/inspo into both emails
1. **`inquiry-notification.tsx`** — extend `Props` with `palette: string[]`, `tones: Record<string, number>`, `insights: string[]`, `inspoUrls: string[]`. Render:
   - Palette block: row of inline HTML swatches using `<td bgcolor="#xxxxxx">` (email-client safe).
   - Top tones: top 3 by weight as text ("Warm · Muted · Light").
   - Insights: bullet list.
   - Inspo: thumbnail grid linked to signed URLs.
2. **`inquiry-confirmation.tsx`** — same palette + insight block so client gets receipt with their style.
3. **Email trigger** — find where `inquiry-notification` is composed (need to confirm: likely in an email queue worker or post-insert hook). Update the payload builder to read `inquiries.metadata.palette/tones/insights/inspo_paths`, sign each inspo storage path against `studio-inspo` bucket (1-week TTL), pass through.

### C. Risks / decisions to confirm before building
- **Inspo bucket is private**. Email must use signed URLs (time-limited). Confirm 7-day TTL is acceptable, or upgrade to a permanent public mirror bucket.
- **html2canvas on inspo images**: client-uploaded blob URLs work fine pre-submit. After submit/clear, they're revoked. Download must happen before submit OR we re-fetch from storage — recommend "download before submit" (button enabled the moment brief has content).
- **Where the email actually fires**: still need to trace the inquiries → notification path. The email-templates registry exists, but the send trigger isn't visible from the files read. Will pinpoint during build (likely `enqueue_email` RPC + a worker or edge function).

### D. Out of scope
- Rebuilding the multi-page admin `BoardDeck` for visitors. The single-page draft is enough for a self-serve receipt.
- Changing the admin curated `/stylebrief/$token` flow (it already has PDF download).

### Files touched
- `src/routes/stylebrief.index.tsx` (download button + data-board-page tag)
- `src/lib/email-templates/inquiry-notification.tsx` (palette/inspo/tones/insights)
- `src/lib/email-templates/inquiry-confirmation.tsx` (palette block)
- Email send worker / function that composes the props (TBD — trace during build)
- Possibly `src/lib/style-brief.functions.ts` if signed URLs are pre-generated at submit time

### Estimate
3 small UI changes + 2 email template extensions + 1 backend wiring step. ~1 build turn for A, ~2 for B+C combined.
