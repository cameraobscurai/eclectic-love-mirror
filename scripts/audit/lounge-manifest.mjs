/**
 * READ-ONLY manifest for lounge seating (sofas, chairs, benches-ottomans).
 * Emits one row per product: current cover, whether the cover filename smells
 * like a detail shot, real-world dimensions presence, and the parsed
 * width/height used by the sizing engine.
 *
 * Writes scripts/audit/lounge-manifest.json. Touches nothing else.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const catalog = JSON.parse(
  fs.readFileSync(path.join(root, "src/data/inventory/current_catalog.json"), "utf8"),
);

const GROUPS = new Set(["sofas", "chairs", "benches-ottomans"]);
const DETAIL = /(detail|closeup|close-up|hardware|swatch|fabric|leg|arm |stitch|tag|label)/i;

function fileName(url) {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() || "");
  } catch {
    return (
      String(url || "")
        .split("/")
        .pop() || ""
    );
  }
}

// crude group inference off live subcategory / category so this script stays
// dependency-free (the TS classifier is the runtime source of truth)
function group(p) {
  const subs = (p.liveSubcategories || []).join(" ").toLowerCase();
  if (/sofa|loveseat|sectional|settee/.test(subs)) return "sofas";
  if (/ottoman|bench/.test(subs)) return "benches-ottomans";
  if (/chair|stool/.test(subs) && !/dining/.test(subs)) return "chairs";
  return null;
}

const rows = [];
for (const p of catalog.products) {
  const g = group(p);
  if (!g || !GROUPS.has(g)) continue;
  const cover = p.primaryImage || (p.images || [])[0] || null;
  const name = cover ? fileName(cover) : "";
  rows.push({
    group: g,
    slug: p.slug,
    title: p.title,
    publicReady: p.publicReady,
    imageCount: p.imageCount,
    cover,
    coverFile: name,
    coverLooksLikeDetail: DETAIL.test(name),
    dimensions: p.dimensions || null,
    hasDimensions: Boolean(p.dimensions && /\d/.test(p.dimensions)),
    isFamily: Array.isArray(p.variants) && p.variants.length > 0,
    variantCount: Array.isArray(p.variants) ? p.variants.length : 0,
  });
}

rows.sort((a, b) => a.group.localeCompare(b.group) || a.title.localeCompare(b.title));

const summary = {};
for (const r of rows) {
  const s = (summary[r.group] ||= { total: 0, noDimensions: 0, detailCover: 0, noCover: 0 });
  s.total++;
  if (!r.hasDimensions) s.noDimensions++;
  if (r.coverLooksLikeDetail) s.detailCover++;
  if (!r.cover) s.noCover++;
}

fs.writeFileSync(
  path.join(here, "lounge-manifest.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), summary, rows }, null, 2),
);
console.log(JSON.stringify(summary, null, 2));
console.log("rows:", rows.length);
