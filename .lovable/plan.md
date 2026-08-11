# Assessment: the engineering recommendations

Verdict up front: **items 1, 4, and 6 are worth doing and pay for themselves within a week. Item 2 is right but lower value than it looks. Items 3, 5, 7 are real but small. Nothing in the document is wrong.** One recommendation (item 4) has an unstated precondition that is most of its cost.

I checked every factual claim against the repo before judging it. Where the doc is off, it is noted below.

---

## What each item actually buys

### 1. Make the rules lint — DO IT FIRST

**Helps with:** the failure mode that has cost the most this year — a good rule that exists only in prose, restated by hand, dropped in the next rewrite.

Verified: `upsert: true` appears at **9 sites** — 7 in `scripts/`, 2 in app code (`photos-admin.functions.ts` writing the overlay snapshot, `boh.server.ts`). Those two are legitimate and need an allowlist entry, which is exactly the design the doc proposes.

This is the highest-value item because it converts vigilance into a build error. Half a day is an accurate estimate.

**Caveat the doc misses:** the ban must be *targeted*. A blanket `upsert: true` ban breaks the overlay publish path, which is supposed to overwrite a pointer. The rule is "no new bytes at a published *image* URL," not "no overwrites."

### 2. A shared script harness — RIGHT, BUT SECOND-TIER

Verified: **32 scripts, 20 of which create their own Supabase client.** The doc's diagnosis is accurate.

**Helps with:** consistency for future scripts and a real dry-run default.

**Why it ranks lower than the doc places it:** the scripts are not what breaks the live site — they run under supervision, on demand, with a human reading the output. The damage they did (poisoned covers) is better prevented by item 1's lint rule than by a harness. Do it on-touch as the doc says; do not schedule a harness sprint.

### 3. Zod at the boundaries — SPLIT THE VERDICT

- **Overlay merge schema: yes.** This is the one that bit. A `.strict()` `LiveOverlayRow` would have made the dropped text fields a loud parse mismatch instead of a silent fallback to baked values.
- **Workbook/CSV import schema: marginal.** Reseed already aborts on off-vocabulary rows and emits a prediction file. Zod makes that two lines instead of twenty. Nice, not urgent.

### 4. Golden-file tests over the merge — HIGHEST VALUE, HIGHEST UNSTATED COST

**Verified problem:** there is **no vitest in the project at all** — no dependency, no script, no config. The test surface today is Playwright specs only.

**The precondition the doc doesn't mention:** the merge is not currently testable. `phase3-catalog.ts` exports `getCollectionCatalog()`, which *fetches the manifest over HTTP and then merges inside the same function*. There is no `merge(baked, overlay)` to point a fixture at. Writing these tests means first extracting a pure function — a real refactor of the single most load-bearing file on the site.

That refactor is worth doing, and it is the actual work item. Budget a day, not an afternoon.

**The four fixtures the doc names are the right four** — overlay text wins, hidden propagates, additions appear, version advances. Every one maps to a bug that shipped.

**Strip Playwright from per-push CI: agreed, unconditionally.** CI has been asserting on the fit solver that Frame Studio retires. Red CI that tests the past trains everyone to ignore CI.

### 5. Standardise on sharp — YES, AND IT IS CHEAP

Verified: sharp is already a dependency; `normalize-covers.py` is the only Python image path. One resampler, one notion of "high-quality downscale." Do this **before** Phase 2 adds a third path, exactly as written.

### 6. IDs in DECISIONS.md — DO IT, BUT THE DOC ASSUMES SOMETHING FALSE

**`docs/DECISIONS.md` contains brand register, site IA, page roles, and design tokens. It contains no engineering rules at all — "R1" and "R2" do not exist in this repo.** They exist only in chat history.

So this is not "add ids to existing entries." It is "write the engineering rules down for the first time, with ids, then have the lint messages cite them." That reframing makes it *more* valuable, not less — it is the root cause of the whole document.

### 7. Small things

- **`scripts/README.md`: yes.** 32 scripts with no index, several destructive. Cheapest item on the list.
- **Typed storage paths: yes, small.** 24 hardcoded `squarespace-mirror/` path sites.
- **Taxonomy reference table as sole source: already true.** Keep it that way; nothing to build.
- **Scheduled deletion of `subcategory_slug` / `category`: yes, with a date.**

---

## What the document misses

Three things worth adding, all traced to real incidents:

1. **No cache-invalidation contract.** The merge caches for a TTL and the manifest is fetched with a minute-bucketed cache-buster. When an admin publishes, "when does it appear" is currently folklore. This deserves a written rule and a test — it is half the round-trip receipt.

2. **The admin has no smoke test.** Every admin regression this year (blank Tableware, broken New-product redirect, publish button not firing) was found by a human clicking. Four Playwright specs on the *admin* — list loads, filter returns rows, drawer saves, publish writes a new manifest — are worth more than every public-page visual assertion currently in CI. Move Playwright to nightly, but point it here.

3. **Photo-quality rules are unenforced.** The Ingram fix landed today because someone looked at a screenshot. `off-angle-covers.mjs` and `cover-audit.mjs` exist but nothing runs them on a schedule. A weekly job that opens a report is the difference between a known defect list and a surprise.

---

## Recommended order

| Order | Item | Cost | Why here |
|---|---|---|---|
| 1 | Write engineering rules into DECISIONS.md with ids (item 6) | 2h | Every other item cites these |
| 2 | Lint the two rules, with allowlist (item 1) | 4h | Vigilance → build error |
| 3 | Extract pure `mergeCatalog()` + 4 vitest fixtures (item 4) | 1d | The bug that shipped tonight |
| 4 | Drop Playwright from per-push; add 4 admin specs nightly (item 4 + gap 2) | 4h | CI stops testing the past |
| 5 | `scripts/README.md` (item 7) | 1h | Cheapest safety win |
| 6 | Zod schema on the overlay row (item 3) | 2h | Rides on the item-3 refactor |
| 7 | Retire `normalize-covers.py` for sharp (item 5) | 3h | Must precede Frame Studio Phase 2 |
| 8 | Harness on-touch, typed paths, column deletion date (items 2, 7) | ongoing | No sprint |

Items 1–4 are roughly two days and cover the entire failure surface from today. Everything below line 4 can wait for the file to be opened for another reason.

## The part to take most seriously

The closing section — *don't over-formalise* — is the most valuable paragraph in the document. No state manager, no monorepo, no coverage target, no 32-script rewrite. The velocity came from small approved tasks with a done-when. These items exist only so the rules stop needing a human to defend them.

## Note

This is an assessment, not a build. Nothing here is implemented yet — approve it and I will execute in the order above, one task at a time with a diff before each.
