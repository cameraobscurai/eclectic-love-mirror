#!/usr/bin/env bun
/**
 * Plan step 4 — fit `aspectBlend` per category against real ink.
 *
 *   bun run scripts/audit/fit-aspect-blend.ts [--min 6]
 *
 * Read-only. Reads the ink stats the bake now persists in
 * `cover_framed_meta` (ink, inkFill, bboxPx) and solves the blend exponent
 * that equalises INK mass rather than bounding-box area.
 *
 * Derivation (width-primary rule):
 *   s              = (T / w) · (a / ref)^(b/2)          a = bbox aspect w/h
 *   rendered box   = T² · ref^(−b) · a^(b−1)
 *   rendered ink   = inkFill · T² · ref^(−b) · a^(b−1)
 *   log(ink area)  = log(inkFill) + (b − 1)·log a + const
 *
 * Equal ink mass across a category means log(ink area) is flat in log a, so
 * regressing log(inkFill) on log(a) gives slope m and the fitted blend is
 *
 *   b* = 1 − m
 *
 * b = 1.0 only holds when ink density is aspect-independent. It is not: long
 * low pieces photograph denser than legged ones, which is why the honest
 * answer sits between 0.65 and 1.0 instead of at either end.
 *
 * Height-primary rules use exponent −b/2, which flips the sign: b* = 1 + m.
 * Area-primary rules ignore the blend entirely and are reported as n/a.
 */
import { createClient } from "@supabase/supabase-js";
import { CATEGORY_RULES, resolveRule } from "../../src/lib/frame-engine";

const MIN_N = Number(process.argv[process.argv.indexOf("--min") + 1]) || 6;

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error("need SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(URL_, KEY);

type Meta = {
  ink?: number | null;
  inkFill?: number | null;
  bboxPx?: [number, number, number, number] | null;
};

const { data, error } = await sb
  .from("inventory_items")
  .select("id, title, category_slug, collection_slug, cover_framed_meta")
  .not("cover_framed_url", "is", null);
if (error) throw error;

type Sample = { logA: number; logFill: number; title: string };
const byCategory = new Map<string, Sample[]>();

for (const row of data ?? []) {
  const meta = (row.cover_framed_meta ?? {}) as Meta;
  const bbox = meta.bboxPx;
  const fill = meta.inkFill;
  if (!bbox || typeof fill !== "number" || fill <= 0) continue;
  const [, , w, h] = bbox;
  if (!w || !h) continue;
  const key = row.category_slug ?? "(none)";
  const list = byCategory.get(key) ?? [];
  list.push({ logA: Math.log(w / h), logFill: Math.log(fill), title: row.title ?? row.id });
  byCategory.set(key, list);
}

/** OLS slope of y on x, with R² and the standard error of the slope. */
function regress(
  xs: number[],
  ys: number[],
): { m: number; r2: number; se: number } | null {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i]! - mx) * (ys[i]! - my);
    sxx += (xs[i]! - mx) ** 2;
    syy += (ys[i]! - my) ** 2;
  }
  if (sxx < 1e-9) return null;
  const m = sxy / sxx;
  const ssRes = syy - m * sxy;
  const r2 = syy < 1e-12 ? 0 : 1 - ssRes / syy;
  const se = Math.sqrt(Math.max(0, ssRes) / Math.max(1, n - 2) / sxx);
  return { m, r2, se };
}

function slope(xs: number[], ys: number[]): number | null {
  return regress(xs, ys)?.m ?? null;
}


const lines: string[] = [
  `# aspectBlend fit against real ink`,
  ``,
  `${new Date().toISOString()} · ${(data ?? []).length} framed rows · min n = ${MIN_N}`,
  ``,
  `\`b*\` is the blend that flattens rendered INK mass across a category.`,
  `Rows below the sample floor are reported but must not be acted on.`,
  ``,
  `| Category | n | primary | current b | slope m | fitted b* | mean inkFill |`,
  `| --- | --- | --- | --- | --- | --- | --- |`,
];

const fitted: Record<string, number> = {};

for (const [cat, samples] of [...byCategory].sort((a, b) => b[1].length - a[1].length)) {
  const rule = resolveRule(cat, null);
  const primary = rule.primary;
  const current = rule.aspectBlend ?? 0;
  const m = slope(samples.map((s) => s.logA), samples.map((s) => s.logFill));
  const meanFill =
    samples.reduce((a, s) => a + Math.exp(s.logFill), 0) / Math.max(1, samples.length);

  let star = "n/a";
  if (primary !== "area" && m !== null) {
    const b = primary === "width" ? 1 - m : 1 + m;
    const clamped = Math.max(0, Math.min(1.5, b));
    star = clamped.toFixed(2);
    if (samples.length >= MIN_N) fitted[cat] = Number(clamped.toFixed(2));
  }

  lines.push(
    `| ${cat} | ${samples.length} | ${primary} | ${current || "—"} | ${
      m === null ? "—" : m.toFixed(3)
    } | ${star} | ${meanFill.toFixed(3)} |`,
  );
}

// ── Pooled fits ─────────────────────────────────────────────────────────────
// Per-category fits on n < ~20 are noise: the same regression that returns
// 0.56 for sofas (n=24) returns 0.20 for dining-chairs (n=9) and slams the
// 1.5 guard for cocktail-tables (n=8). Those are not physics, they are small
// samples. A blend is a property of a *rule*, and the rule is shared, so the
// fit belongs at the rule's pooled level with a significance gate on it.
const GROUPS: Record<string, string[]> = {
  seating: ["sofas-loveseats", "lounge-chairs", "benches", "ottomans", "dining-chairs", "banquettes"],
  tables: [
    "coffee-tables",
    "side-tables",
    "consoles",
    "cocktail-tables",
    "community-tables",
    "dining-tables",
  ],
};

lines.push(``, `## Pooled fits (act on these, not the per-category rows)`, ``);
lines.push(`| Group | n | current b | slope m | ±SE | R² | fitted b* | verdict |`);
lines.push(`| --- | --- | --- | --- | --- | --- | --- | --- |`);

for (const [group, cats] of Object.entries(GROUPS)) {
  const samples = cats.flatMap((c) => byCategory.get(c) ?? []);
  const reg = regress(samples.map((s) => s.logA), samples.map((s) => s.logFill));
  const current = resolveRule(cats[0]!, null).aspectBlend ?? 0;
  if (!reg) {
    lines.push(`| ${group} | ${samples.length} | ${current} | — | — | — | — | insufficient data |`);
    continue;
  }
  const b = Math.max(0, Math.min(1.5, 1 - reg.m));
  // Two standard errors. Below that the data cannot tell this slope from zero,
  // and "no evidence" must not be laundered into a new constant.
  const significant = Math.abs(reg.m) > 2 * reg.se;
  lines.push(
    `| ${group} | ${samples.length} | ${current} | ${reg.m.toFixed(3)} | ${reg.se.toFixed(
      3,
    )} | ${reg.r2.toFixed(2)} | ${b.toFixed(2)} | ${
      significant ? "significant — adopt" : "not significant — hold"
    } |`,
  );
}

lines.push(
  ``,
  `## Fitted per category (n >= ${MIN_N}) — diagnostic only`,
  ``,
  "```json",
  JSON.stringify(fitted, null, 2),
  "```",
  ``,
  `## Caveats`,
  ``,
  `- \`secondaryMax\` and \`widthMax\`/\`heightMax\` bind before the exponent does on`,
  `  extreme aspects, so a refit alone will not move every tile.`,
  `- Any change to a blend value changes the recipe and therefore the hash: the`,
  `  affected collections need a fresh bake at a new path, never an overwrite (R1).`,
  `- Ink is measured on the SOURCE silhouette, so a category shot mostly at an`,
  `  angle carries a density bias the regression cannot separate from aspect.`,
);


const out = lines.join("\n");
console.log(out);
await Bun.write("docs/receipts/aspect-blend-fit.md", out + "\n");
console.log(`\nwrote docs/receipts/aspect-blend-fit.md · ${Object.keys(CATEGORY_RULES).length} rules in table`);
