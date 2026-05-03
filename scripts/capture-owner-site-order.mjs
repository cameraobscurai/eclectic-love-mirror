// Captures per-category product order from eclectichive.com (the owner's
// live Squarespace site) and writes src/data/phase3/owner_site_order.json.
//
// Why: the owner curated her live-site grid order over many years. Items at
// the top of each category page are her "stars" on purpose. We mirror that
// order on our Collection page as a soft hint — unmatched items tail by our
// existing keyword rank. Re-run on demand:
//
//   FIRECRAWL_API_KEY=... bun scripts/capture-owner-site-order.mjs
//
// Output keys are our internal categorySlug values, so the build script can
// join cleanly without renaming.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const API_KEY = process.env.FIRECRAWL_API_KEY;
if (!API_KEY) {
  console.error("FIRECRAWL_API_KEY is not set in the environment.");
  process.exit(1);
}

// liveSlug → our internal categorySlug used in phase3_catalog.
// Some live categories map to multiple internal slugs (Lounge → lounge +
// sofas-loveseats1 + chairs-stools1 + benches-ottomans1, etc.). The build
// script will resolve a product against the most specific match it has.
const SOURCES = [
  { live: "lounge", url: "https://www.eclectichive.com/lounge", maps: ["lounge", "sofas-loveseats1", "chairs-stools1", "benches-ottomans1"] },
  { live: "lounge-tables", url: "https://www.eclectichive.com/lounge-tables", maps: ["lounge-tables", "tables1"] },
  { live: "cocktail-bar", url: "https://www.eclectichive.com/cocktail-bar", maps: ["cocktail-bar", "bars1"] },
  { live: "dining", url: "https://www.eclectichive.com/dining", maps: ["dining"] },
  { live: "tableware", url: "https://www.eclectichive.com/tableware", maps: ["tableware"] },
  { live: "light", url: "https://www.eclectichive.com/light", maps: ["light"] },
  { live: "textiles", url: "https://www.eclectichive.com/textiles", maps: ["textiles", "pillows-throws1"] },
  { live: "rugs", url: "https://www.eclectichive.com/rugs", maps: ["rugs"] },
  { live: "styling", url: "https://www.eclectichive.com/styling", maps: ["styling", "accents1"] },
  { live: "large-decor", url: "https://www.eclectichive.com/large-decor", maps: ["large-decor"] },
];

async function scrape(url) {
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
    }),
  });
  if (!res.ok) {
    throw new Error(`Firecrawl ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  // SDK v2 returns { success, data: { markdown, ... } } via REST.
  const md = json?.data?.markdown ?? json?.markdown;
  if (!md) throw new Error(`No markdown in response for ${url}`);
  return md;
}

// Squarespace renders each product title as a top-level `# Title` heading.
// The order in the markdown matches the visual grid order on the page.
function extractTitles(markdown) {
  const lines = markdown.split("\n");
  const titles = [];
  const seen = new Set();
  for (const line of lines) {
    const m = /^#\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    const t = m[1].trim();
    // Skip the page header (the category name itself often appears as h1).
    // Heuristic: skip headings that match a known nav label exactly.
    if (/^(lounge seating|lounge tables|cocktail & bar|dining|tableware|lighting|textiles|rugs|styling|large decor|inventory)$/i.test(t)) continue;
    // De-dupe — Squarespace sometimes duplicates titles in alt text blocks.
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    titles.push(t);
  }
  return titles;
}

const out = {
  capturedAt: new Date().toISOString(),
  source: "eclectichive.com",
  // sourceLive → titles[] in DOM/grid order
  liveCategories: {},
  // map of internal categorySlug → liveCategory key (for the build join)
  internalToLive: {},
};

for (const src of SOURCES) {
  process.stdout.write(`scraping ${src.url} ... `);
  try {
    const md = await scrape(src.url);
    const titles = extractTitles(md);
    out.liveCategories[src.live] = titles;
    for (const internal of src.maps) out.internalToLive[internal] = src.live;
    console.log(`${titles.length} titles`);
  } catch (err) {
    console.log(`FAILED: ${err.message}`);
  }
}

const path = "src/data/phase3/owner_site_order.json";
mkdirSync(dirname(path), { recursive: true });
writeFileSync(path, JSON.stringify(out, null, 2) + "\n");
console.log(`\nWrote ${path}`);
