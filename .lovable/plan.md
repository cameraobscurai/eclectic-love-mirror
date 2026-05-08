## Goal
Tag every pillow with `color_family` + L* (perceptual lightness) so Collection sorts darkest → lightest. No QA loop. Trust the pipeline.

## Why current tagger isn't trustworthy enough
Reading `scripts/tag-colors.mjs` — three weak spots:
1. **Single AI pass, no self-check.** One Gemini call per item. Misreads slip through.
2. **Title is a hint, not a constraint.** Owner names items by color first ("Brown Cognac Leather Lumbar"). The pipeline ignores that 95%-reliable signal.
3. **Pixel extract fails on cutout/seamless backgrounds.** Ivory pillows on white backdrop → corner mask eats half the pillow.

## Plan — three-signal tagger, runs once, self-validates

**1. Title-as-prior parser** — `scripts/lib/title-color-prior.mjs` (new)
- Curated lexicon mapping color words → 16-family taxonomy:
  - `ivory→cream`, `white→white`
  - `beige|tan|sand|oatmeal|champagne|greige→tan`
  - `brown|cognac|chocolate|mink→brown`
  - `black→black`, `grey|gray→grey`, `silver→metallic-cool`
  - `blue|denim|navy|turquoise→blue`
  - `green|sage|olive|breen→green`
  - `gold|mustard→metallic-warm`
  - `red|maroon→red`, `orange|copper|rust→orange`
  - `pink|rose→pink`, `purple|plum→purple`
- Pattern words (`leopard|zebra|plaid|stripe|patchwork|abstract|native|mud cloth|geo|brocade|wild bird`) flagged but don't override — first color word still wins.
- First color word = dominant tone. Returns `{primaryFamily, secondaryFamily, isPattern, confidence}`.

**2. Three-signal reconciliation in `processOne`**
- **A:** title prior (deterministic, free)
- **B:** pixel extract (existing, fixed below)
- **C:** AI vision (existing, prompt upgraded)
- **Decision:** if title is high-confidence AND (pixel OR AI) family agrees → write title's family, take L*/hex from the agreeing color signal. If title says pattern → trust AI for dominant pick. If all three disagree → write title family, mark `color_needs_review=true` (logged, not gated).

**3. Better AI prompt + few-shot**
- Inline 6 reference examples in the system prompt covering the tricky cases: ivory-on-pattern, champagne vs ivory, brown fur, plaid where one color dominates.
- Constraint: "The first color word in the title names the dominant tone unless visually impossible. Override only with strong evidence and explain in `reasoning`."
- Add `title_color_word` field to the tool schema so overrides are visible in logs.

**4. Pixel extract fixes**
- If hero is a cutout/PNG-on-white, corner mask eats the product. Detect: if >60% of pixels match corner color, skip pixel signal entirely (title + AI is enough — don't poison reconciliation).
- Bump quantization 4-bit → 5-bit so champagne ≠ ivory cluster.

**5. Patterned items keep both colors**
- When `isPattern` OR AI returns `family=multi`: write both `color_hex` (dominant) + `color_hex_secondary`. tonalRank uses primary L*, sort still works.

**6. L* is the safety net**
- L* is mechanical from the actual hex. Even if family lands wrong, L* lands right → pillow sits in the correct brightness band on the grid. Worst-case visual outcome: minor.

**7. Run scoped to pillows-throws, then bake**
- Add `--category` flag to tagger.
- `bun scripts/tag-colors.mjs --apply --category=pillows-throws --retag`
- `bun scripts/bake-catalog.mjs`
- No dry-run, no manifest gate.

**8. Built-in self-validation (replaces your QA)**
After write, the script computes and logs:
- Family distribution: count + L* range per family + 3 random sample titles per family
- Pattern detection rate
- AI-overrode-title count (red flag if >15%)
- Pixel-skipped count

If anomalies detected (e.g. only 2 items tagged "white" but 40 titles contain "white"; or one family has L* range >70 spanning dark to light), script exits non-zero with the conflict listed. I fix and re-run automatically.

## What changes vs current pipeline
- Title is first-class signal, not flavor text
- 3-way vote replaces 2-way ΔE
- Few-shot prompt teaches the merchandising intuition
- Self-check catches obvious failures without owner involvement

## What I need from you
"Go." I ship the lexicon, prompt, reconciler, run on pillows-throws, bake, report numbers. No checkpoint.

## Files
- New: `scripts/lib/title-color-prior.mjs`
- Edited: `scripts/tag-colors.mjs` (add `--category`, three-signal reconcile, post-run self-check)
- No DB schema change. No new secrets. ~165 Gemini calls.