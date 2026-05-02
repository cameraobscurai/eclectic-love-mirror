This is an exceptionally well-crafted, surgical engineering plan. You are shifting the app from a fragile, "vibes-based" MVP to a deterministic, enterprise-grade architecture, and you are doing it without blowing up the existing user experience.

Regarding the owner's requirement for **chronological order**, your sequencing table absolutely nails this. By breaking the work into isolated, independently shippable phases (1 through 7), you are providing a strict, linear roadmap. The owner can see exactly what happens first, what follows, and how each step unlocks the next without risking the live environment.

Here is exactly why this plan is so strong:

### The Highlights

- **The Safety Net (Phase A):** Moving from imperative `for`-loop spaghetti to a declarative, scored ruleset is the exact right move. Adding snapshot tests for the 80 representative products ensures you can refactor the taxonomy without the constant fear of breaking the categorization.
- **Zero-Dependency Search (Phase B):** Using FlexSearch client-side for an 800-item catalog is incredibly smart. It gives you the power of multi-field tokenization and synonyms without the overhead of spinning up Algolia or Elasticsearch.
- **The "Escape Hatch" (Phase D):** Building the Admin Audit view with a Supabase override table is the best part of this spec. It completely removes the developer from the loop when the owner inevitably disagrees with the algorithm. It shifts the power back to the business.
- **Strict Scope Management:** Explicitly stating that inventory mutations and primary image selections are out of scope protects you from scope creep and respects the project's core boundaries.

### Minor Observation for Phase A

When you build the declarative array in `A1` (`{ id, when, score }`), just ensure your `score` logic has a clear tie-breaker mechanism for when two rules evaluate to the exact same score. Defaulting to the "first match in the array" if scores tie is fine, as long as it is a documented behavior for the taxonomy module.

---

Your chronological sequencing (Part 1 -> Phase A -> Phase B -> Phase C -> Phase D) is ready for immediate execution.

  
  
Goal

Two passes on the Collection page:

1. **Typography + dedupe** — quick visual cleanup to honor brand register and remove the repetition with the global nav.
2. **Filtering rework — AAA** — turn the current ad-hoc filter pipeline into a tested, deterministic, debuggable system. No more "vibes-based" routing.

---

## Part 1 — Typography + dedupe (10 min, low risk)

### A. Hero wordmark → "THE COLLECTION", left-aligned

In `src/routes/collection.tsx` (the hero block, ~lines 481–508):

- Change `<h1>The Collection</h1>` → `THE COLLECTION` (uppercase as a literal — Cormorant uppercase has the right brand presence; we don't want to rely on `text-transform` because the Cormorant glyphs read better when we choose them explicitly).
- Replace `text-center` → `text-left` on the wrapper.
- Tighten letter-spacing slightly to `tracking-[-0.005em]` so the uppercase doesn't read airy.
- Keep the scroll-driven `heroScale / heroOpacity / heroY` motion intact.

### B. Remove the duplicate "HIVE SIGNATURE COLLECTION" eyebrow

The global nav already shows "HIVE SIGNATURE COLLECTION" as the active nav item with a rule underneath. The eyebrow above the wordmark is the same text — pure repetition.

- Delete the `<p>HIVE SIGNATURE COLLECTION</p>` line above the `<h1>` in the hero.
- The page title reads as a clean editorial slug: an oversized "THE COLLECTION" left-aligned, sitting under the active nav indicator that already names the section.

### C. Sticky bar wordmark — drop "THE COLLECTION" prefix

Currently the sticky bar (`stickyMarkLabel`) reads `THE COLLECTION · SOFAS · 44`. With nav already saying "HIVE SIGNATURE COLLECTION", we don't need to repeat the section name in the sticky bar either.

- Reduce to: `SOFAS · 44` when a category is active, and just blank (let the result-meta on the left carry it) when on overview.
- Also delete the `resultMeta` text on the left when sticky wordmark is showing the same info — single source of truth.

### Files touched (Part 1)

- `src/routes/collection.tsx` — hero block + sticky `stickyMarkLabel` derivation.

---

## Part 2 — AAA Filtering Rework

### What's actually broken

I audited the current pipeline. The numbers look healthy on the surface (99.2% of 876 products assigned to a browse group, 7 unassigned), but the **architecture** has structural problems that will keep generating issues forever:

1. **Classification is buried in 200+ lines of imperative keyword rules** (`BROWSE_RULES` in `collection-browse-groups.ts`). Adding a category, fixing a misclassification, or auditing what changed is a manual diff exercise. There's no test, no fixture, no snapshot.
2. **Two parallel taxonomies that don't talk to each other** — `collection-browse-groups.ts` and `collection-subcategories.ts` re-derive overlapping things from `title` keywords with different rules. Sofas/Chairs/Stools/Benches appear in both files with different keyword lists.
3. **Search is `title.includes(query)**` — single field, no tokenization, no ranking beyond exact/prefix, no description, no category, no synonyms. Searching "couch" misses sofas. Searching "marble" misses anything because materials aren't searchable.
4. **No filter combinatorics** — you can pick exactly one category. There are no facets for materials, color, dimensions, in-stock-only, vendor, or subcategory. The Quick View shows dimensions and stock; the filter rail can't use either.
5. **Failed-image filtering is a per-session `Set<string>**` that quietly removes products from counts without surfacing why. Counts in the rail can drift from grid contents.
6. **No observability** — when the owner says "this piece should be under Side Tables, not Console", there's no way to see *why* the rule put it where it put it, no logged classification trace.
7. **URL state is one-way** — `?group=&q=&sort=&density=&view=` can't express subcategory, material, color, or stocked-only without another schema rev.

### The plan — 4 phases, each independently shippable

```text
Phase A — Foundations         (scoring + tests, no UI change)
Phase B — Search v2           (FlexSearch index, multi-field, synonyms)
Phase C — Faceted filtering   (subcategory + materials + stocked-only)
Phase D — Owner-facing audit  (admin-only "why did it land here?" view)
```

---

### Phase A — Foundations (no UI change, lots of safety)

**A1. Single classification module with a stable contract**

Replace the two overlapping files (`collection-browse-groups.ts` + `collection-subcategories.ts`) with one module: `src/lib/collection-taxonomy.ts`.

Public API:

```ts
classify(product): {
  group: BrowseGroupId;       // never null — fallback to "accents"
  subgroup: SubgroupId | null;
  trace: ClassificationTrace; // which rule fired, in what order
}
```

The rules table moves from imperative `for`-loop logic to a **declarative, ordered array of `{ id, when, score }` predicates**, where each predicate runs against `{ title, categorySlug, description, dimensions }`. Score lets us pick the highest-confidence match instead of "first wins" — fixes the Console-vs-Side-Table ambiguity cleanly.

**A2. Fixture-based snapshot tests**

Create `src/lib/__tests__/collection-taxonomy.test.ts` with a frozen fixture of `(title, categorySlug) → expectedGroup` for ~80 representative products (every group + every known edge case, including the 7 currently unassigned). Run via `bunx vitest run`. This is the safety net that lets us touch the rules without fear.

**A3. Build-time audit script**

Extend `scripts/build-phase3-catalog.mjs` (or add a sibling) so `bun scripts/build-phase3-catalog.mjs` prints:

- Per-group counts
- Unassigned products list
- Products with low confidence (multiple rules tied)
- Diff vs the previous run (so a CSV update flags reclassifications)

This emits to `src/data/phase3/phase3_classification_report.json`. Owner can read it.

---

### Phase B — Search v2

**B1. Add FlexSearch index** (~6KB gzipped, zero deps beyond itself):

```ts
const index = new FlexSearch.Document({
  document: {
    id: "id",
    index: ["title", "displayCategory", "description"],
    store: ["id", "title"],
  },
  tokenize: "forward",
});
```

Build the index once in a `useMemo` from the catalog. Search becomes `index.search(q, { enrich: true })` → ordered ids → look up products. Result: real ranking, real prefix/infix matching, far better than `String.includes`.

**B2. Synonym layer**

Small `SYNONYMS: Record<string, string[]>` map for the obvious ones the owner sees daily: `couch → sofa, settee`, `loveseat → sofa`, `barstool → stool`, `daybed → bench, sofa`, etc. Applied as query expansion before passing to FlexSearch. Lives in the taxonomy module so synonyms and classification share vocabulary.

**B3. Search-rank > sort-rank during a query** — keep current behavior, but the source of "rank" is FlexSearch's score now, not `startsWith`.

---

### Phase C — Faceted filtering

**C1. URL schema extension** (additive, backwards-compatible)

```ts
{
  group, q, sort, density, view,    // existing
  sub,        // subgroup id within group
  stocked,    // "1" | undefined  (only show in-stock pieces)
  custom,     // "1" | undefined  (only show custom-order pieces)
}
```

All Zod-validated with `fallback()` so old URLs keep working.

**C2. Subgroup chips inside a category**

When a group is active and `classify()` returned subgroups for it (e.g., Tables → Coffee / Side / Cocktail / Console / Dining), render a quiet horizontal chip row directly under the sticky bar. Counts respond to current search state. Single-select. No chips render when the group has only one subgroup — never expose a UI element that does nothing.

**C3. "Stocked only" toggle** in the right-side controls

Reads the existing `stockedQuantity` field. One checkbox, one URL param. This is the single highest-value missing filter — the catalog already carries the data, the Quick View already shows it, and event planners filter on it constantly.

**C4. Empty-state design**

If a filter combination yields zero results: editorial empty state (no clip-art) that names the active filters, offers a single "Clear filters" CTA, and shows the 4 nearest categories with non-zero counts. No silent zero grid.

---

### Phase D — Owner-facing audit (admin-gated)

Owner has said repeatedly: "I want to know *why* this piece is under that category." Build it once.

- New route `/admin/collection-audit` (gated by existing `has_role('admin')` check, using the same auth pattern as the rest of the admin surface).
- Table: every product, columns = `title | categorySlug | resolvedGroup | resolvedSubgroup | rule that fired | confidence`.
- Filter inputs at the top to scope to "unassigned only" / "low confidence only" / "specific group".
- One column = "this is wrong, send to ___" — writes the override into a small `taxonomy_overrides` table in Lovable Cloud (Supabase). Classifier reads overrides first, then rules. No more begging the AI to "please fix the keyword for credenza."

---

## Sequencing


| Step | Phase                             | Risk                            | Approx scope          |
| ---- | --------------------------------- | ------------------------------- | --------------------- |
| 1    | Part 1 (typography + dedupe)      | low                             | 1 file                |
| 2    | A1 + A2 (taxonomy module + tests) | low — pure refactor under tests | 3 files               |
| 3    | A3 (build-time audit)             | low                             | 1 script              |
| 4    | B (search v2 + synonyms)          | medium                          | 2 files               |
| 5    | C1–C3 (facets + URL)              | medium                          | 3 files               |
| 6    | C4 (empty state)                  | low                             | 1 file                |
| 7    | D (admin audit)                   | medium — touches DB             | 1 route + 1 migration |


Steps 1–3 are the foundation and ship together as the "AAA" baseline. 4–6 are the user-visible filtering wins. 7 is the long-term answer to "why is this here."

---

## Out of scope (intentionally)

- No re-import of the CSV or any inventory mutations — taxonomy is display-only, exactly per the project's Core memory rule ("Lovable builds interface/workflow only — never inventory authority").
- No changes to image storage, primary image selection, or `product_images` writes.
- No changes to the Inquiry tray / inquiries flow.

---

## What I need from you to proceed

Approve the plan and I'll start with **Part 1 (typography + dedupe)** plus **Phase A1–A3** in the same pass, since they're cheap and unlock the rest. Phases B–D each get their own approval gate so you see the result before we move on.