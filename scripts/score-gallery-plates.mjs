// ---------------------------------------------------------------------------
// Score every gallery plate for "wow factor" + product visibility via Lovable
// AI Gateway (Gemini 3 Flash). Output → src/data/gallery/plate-scores.json.
//
// Usage:
//   bun scripts/score-gallery-plates.mjs            # score missing only
//   bun scripts/score-gallery-plates.mjs --force    # rescore everything
//   bun scripts/score-gallery-plates.mjs --limit 20 # dry sample
//
// Cost control: uses Supabase render endpoint at 384px so each vision call
// ships a tiny image, ~700 plates ≈ a few dollars on gemini-3-flash.
// ---------------------------------------------------------------------------

import fs from "node:fs/promises";
import path from "node:path";

const SUPABASE_URL = "https://wdyfavzfquegrxklcpmq.supabase.co";
const RENDER_BASE = `${SUPABASE_URL}/storage/v1/render/image/public/image-galleries`;
const SCORES_PATH = "src/data/gallery/plate-scores.json";
const ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";
const CONCURRENCY = 6;

const args = new Set(process.argv.slice(2));
const FORCE = args.has("--force");
const LIMIT_ARG = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split("=")[1]) : Infinity;

const apiKey = process.env.LOVABLE_API_KEY;
if (!apiKey) {
  console.error("LOVABLE_API_KEY missing");
  process.exit(1);
}

// Pull every *GalleryPaths array out of the manifests module.
const manifests = await import(path.resolve("src/content/gallery-manifests.ts"));
const allPaths = new Set();
for (const [name, val] of Object.entries(manifests)) {
  if (!name.endsWith("GalleryPaths")) continue;
  if (!Array.isArray(val)) continue;
  // Exclude planners we never publish.
  if (name.startsWith("vanderWeide")) continue;
  for (const p of val) allPaths.add(p);
}

const paths = [...allPaths];
console.log(`Discovered ${paths.length} plates across galleries.`);

const existing = JSON.parse(await fs.readFile(SCORES_PATH, "utf8").catch(() => "{}"));
const todo = paths.filter((p) => FORCE || !existing[p]).slice(0, LIMIT);
console.log(`Scoring ${todo.length} (skip ${paths.length - todo.length} already scored).`);

const SYSTEM = `You rate event-design photographs for an editorial gallery whose audience is interior-designers and event planners shopping decor rentals. Reply ONLY with compact JSON.`;

const USER = `Rate this image on two axes 0-10:
- wow: how grand, dramatic, stunning, scroll-stopping the SCENE is. Sweeping tablescapes at dusk, fully styled rooms, candlelit long tables, big architectural reveals = 9-10. Tight detail shots = 4-6. Empty pre-event setup, harsh daylight, blurry, or back-of-house = 0-3.
- product: how visible the decor / furniture / tabletop product is (chairs, glassware, linens, lounges, lighting). 10 = product hero. 0 = guests/portraits only, no product.

Penalize: portrait-forward photos, candid people shots, snapshots, harsh flash, anything that looks like a phone pic.
Reward: editorial composition, depth, magazine-cover energy, full environments.

Respond as: {"wow": <0-10 number>, "product": <0-10 number>}`;

async function score(p) {
  const url = `${RENDER_BASE}/${p.split("/").map(encodeURIComponent).join("/")}?width=384&quality=70`;
  const body = {
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: [
          { type: "text", text: USER },
          { type: "image_url", image_url: { url } },
        ],
      },
    ],
    response_format: { type: "json_object" },
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
      });
      if (r.status === 429) {
        await new Promise((res) => setTimeout(res, 2000 * (attempt + 1)));
        continue;
      }
      if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
      const j = await r.json();
      const txt = j.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(txt);
      return { wow: Number(parsed.wow) || 0, product: Number(parsed.product) || 0 };
    } catch (e) {
      if (attempt === 2) throw e;
      await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
    }
  }
  throw new Error("unreachable");
}

let done = 0;
let failed = 0;
const results = { ...existing };

async function worker(slice) {
  for (const p of slice) {
    try {
      results[p] = await score(p);
    } catch (e) {
      failed++;
      console.error(`fail ${p}:`, e.message?.slice(0, 100));
    }
    done++;
    if (done % 25 === 0) {
      await fs.writeFile(SCORES_PATH, JSON.stringify(results, sortedKeys(results), 2));
      console.log(`  ${done}/${todo.length} (${failed} failed)`);
    }
  }
}

function sortedKeys(obj) {
  return Object.keys(obj).sort();
}

// Stripe paths across workers.
const slices = Array.from({ length: CONCURRENCY }, () => []);
todo.forEach((p, i) => slices[i % CONCURRENCY].push(p));
await Promise.all(slices.map(worker));

// Stable, sorted write.
const sorted = Object.fromEntries(Object.keys(results).sort().map((k) => [k, results[k]]));
await fs.writeFile(SCORES_PATH, JSON.stringify(sorted, null, 2));
console.log(`Done. ${done} scored, ${failed} failed. Wrote ${SCORES_PATH}.`);
