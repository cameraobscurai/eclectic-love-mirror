## One test send to info@eclectichive.com

Direct POST to `/api/public/notify-inquiry` (same route the contact form uses) with a realistic payload. No loops, no batches — one call, one email.

### What gets sent

- **To:** info@eclectichive.com
- **Reply-To:** the test client email below (so hitting Reply looks real)
- **Subject:** `[TEST] New Hive inquiry — Sarah Whitman (4 pieces)`
- **Eyebrow in body:** `ECLECTIC HIVE — [TEST] NEW INQUIRY`

To get "TEST" into the subject + header without changing template code, I'll prepend `[TEST]` to the `name` field on this one send only (template builds subject from name, and the heading renders the name). Clean, no code edit, no permanent template change.

Actually cleaner: pass `subject: "[TEST] Please ignore — pipeline check"` so the italic subject line in the email body reads as TEST, and prepend `[TEST]` to name so the email subject line also reads TEST. Both surfaces flagged.

### Realistic payload

```text
name:         [TEST] Sarah Whitman
email:        sarah.whitman@example.com
phone:        +1 (310) 555-0142
subject:      [TEST] Please ignore — pipeline check
project_date: October 18, 2026
budget:       $18,000 – $25,000
scope:        Full styling + tablescape for 48-person desert dinner at Amangiri
message:      Hi Hive — planning an intimate sunset dinner for 48 in the
              Amangiri pavilion the weekend of Oct 17–19. Looking for warm,
              low, candlelit textures — lots of pampas, bone, raw linen,
              hammered brass. Open to your full point of view on tabletop.
              Would love to walk through the pieces below on a call next week.
items:        4 real pieces pulled from current_catalog.json
              (seating + tableware + styling + candlelight, one each,
               with real rms_id, title, category)
inquiry_id:   test-<timestamp>
```

### How I'll pick the 4 real items

Read `src/data/inventory/current_catalog.json`, grab the first public-ready product from each of: seating, tableware, styling, candlelight. Use their real `rms_id`, `title`, `displayCategory`. No fabricated SKUs.

### Execution

One shell call: `curl -X POST https://eclectichivedraft.lovable.app/api/public/notify-inquiry` (published URL, since that's where mail infra runs in prod) with the JSON body above.

Then one `email_send_log` query to confirm exactly one new row with `status=sent` and `template_name=inquiry-notification`. Report back the message_id.

### Not doing

- No template code changes
- No new routes
- No DB inserts into `inquiries` (this is a notification test, not a form submission test — keeps your admin inbox clean)
- No repeat sends
