---
name: Engineering rules R1-R8
description: Numbered load-bearing engineering rules in docs/DECISIONS.md, what enforces each, and how to cite them in plans
type: preference
---

# Engineering rules (R1–R8)

Written into `docs/DECISIONS.md` on 2026-08-12 under "Engineering rules". Each
rule has an id, the rule, and the receipt (the failure that caused it). **Cite
the id in plans and code comments** — that is the entire point. Rules that live
only in chat got dropped from five plan rewrites in one day.

- **R1** — no new bytes at a published image URL (new path + repoint instead)
- **R2** — the public browser never measures pixels
- **R3** — derivatives are verifier-gated
- **R4** — the studio composes, never retouches (pixel-existence test)
- **R5** — canvas aspect equals tile aspect
- **R6** — RMS owns RMS fields; humans own declared fields
- **R7** — dry-run by default; no defect count before measurement
- **R8** — Publish is the only path from admin edit to live

## Enforcement

`bun run rules:check` → `scripts/audit/rules-check.mjs`, wired into CI before
the expensive Playwright job.

- R1: scoped to **image-byte** uploads only. Pointer/metadata overwrites (the
  overlay snapshot in `photos-admin.functions.ts`, `catalog/manifest.json`) are
  explicitly out of scope and allowlisted. The four historic in-place cover
  scripts (`nano-upscale-covers`, `reframe-covers`, `swap-bar-images`,
  `sync-product-covers`) now refuse to run without `ALLOW_R1_OVERWRITE=1`.
- R2: **baseline mode** — `scripts/audit/r2-baseline.json` freezes the current
  5 public-surface importers of the live measurement modules. Count may fall,
  never rise. Flips to a hard ban when Frame Studio Phase 5 lands; delete the
  baseline file then.
- R6: `bun run intake:test` (`scripts/audit/intake-loop-test.mjs --apply`).
- R7: advisory list only, not a failure. Convert scripts on next touch.

## Don't

Do not "clean up" the R1 guards by deleting the retired scripts, and do not
widen the R1 lint to all `upsert: true` — banning pointer writes breaks Publish.
