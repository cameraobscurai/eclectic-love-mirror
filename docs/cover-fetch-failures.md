# Cover fetch failures

Re-run 2026-08-11 — `node scripts/cover-audit.mjs --refetch`
(3 attempts each, plus a raw storage-object fallback).

The prior audit reported **13** FETCH_FAIL rows: tables 7, tableware 3,
seating 2, serveware 1.

- Transient (fetched and measured cleanly on the corrected full run): **13**
- Genuinely dead (blank tile on the live site right now): **0**

`--refetch` afterwards found zero remaining FETCH_FAIL rows in the CSV, which
confirms the diagnosis: transform-service hiccups under concurrency, not
missing storage objects. No replacement-photo tickets are owed.

## Dead objects — replacement photo tickets

None.
