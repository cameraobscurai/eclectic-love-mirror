// Dinnerware (plates/bowls/chargers) cleanup:
// Each variant currently carries family-Set photo + own piece photo, and some
// also carry every other piece in the family. Owner wants ONE image per row:
// the piece itself. Drop Set photos, drop cross-piece photos.
//
// Strategy:
//   - rowSize  = first decimal number in title (e.g. 10, 10.5, 8.25, 11)
//   - rowForm  = "charger" | "bowl" | "low bowl" | "plate" | "saucer" | "cup" | "mug"
//   - For each image URL, parse its filename:
//       * if filename contains "Set"           → DROP
//       * extract fileSize (first decimal num)
//       * if fileSize exists and != rowSize    → DROP (cross-piece)
//       * if fileSize missing AND filename has a form keyword:
//           if formKeyword == rowForm           → KEEP (e.g. "AKOYA Charger" for the only Charger row)
//           else                                → DROP
//       * otherwise                            → KEEP

import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const FORM_KEYWORDS = ["low bowl","charger","bowl","saucer","plate","cup","mug","tea cup","coffee cup"];

function basename(u){ try { return decodeURIComponent(new URL(u).pathname.split("/").pop()||""); } catch { return u; } }
function normLower(s){ return (s||"").toLowerCase().replace(/[_+]/g," ").replace(/\.[a-z]+$/,"").replace(/\s+/g," ").trim(); }
function parseSize(s){
  // first decimal-or-int token, ignore things like "0c5b" hashes by requiring a leading non-hex context
  const m = normLower(s).match(/(?:^|\s|-)(\d+(?:\.\d+)?)(?=in\b|"|\s|$|inch)/);
  return m ? parseFloat(m[1]) : null;
}
function findForm(s){
  const n = " " + normLower(s) + " ";
  for (const f of FORM_KEYWORDS) if (n.includes(" "+f+" ")) return f;
  return null;
}

const raw = execSync(
  `psql -At -F$'\\t' -c "SELECT rms_id, title, array_to_string(images, '|||') FROM inventory_items WHERE category='tableware' AND status<>'draft' AND array_length(images,1) >= 2 AND (title ILIKE '%plate%' OR title ILIKE '%bowl%' OR title ILIKE '%charger%' OR title ILIKE '%saucer%' OR title ILIKE '%cup%' OR title ILIKE '%mug%') ORDER BY title"`,
  { encoding: "utf8", maxBuffer: 32*1024*1024 }
);
const rows = raw.trim().split("\n").filter(Boolean).map(l=>{
  const [rms_id,title,joined] = l.split("\t");
  return { rms_id, title, images: (joined||"").split("|||").filter(Boolean) };
});

const plan = [];
for (const r of rows) {
  const rowSize = parseSize(r.title);
  const rowForm = findForm(r.title);
  if (rowSize == null && !rowForm) continue;
  const keep=[], drop=[];
  for (const u of r.images) {
    const fn = basename(u);
    const fnLower = normLower(fn);
    if (/\bset\b/.test(fnLower) || fnLower.includes("family-sets")) { drop.push({u, why:"set"}); continue; }
    const fileSize = parseSize(fn);
    if (fileSize != null) {
      if (rowSize != null && Math.abs(fileSize - rowSize) > 0.01) { drop.push({u, why:`size ${fileSize} != ${rowSize}`}); continue; }
      keep.push(u); continue;
    }
    const fileForm = findForm(fn);
    if (fileForm) {
      if (rowForm && fileForm === rowForm) keep.push(u);
      else drop.push({u, why:`form ${fileForm} != ${rowForm}`});
      continue;
    }
    // unknown filename — keep to be safe
    keep.push(u);
  }
  // Fallback: if we'd drop everything, keep the Set photo so the row stays renderable
  if (keep.length === 0 && drop.length) {
    const setImg = drop.find(d => d.why === "set");
    if (setImg) { keep.push(setImg.u); drop.splice(drop.indexOf(setImg),1); }
  }
  if (drop.length) plan.push({ rms_id:r.rms_id, title:r.title, was:r.images.length, now:keep.length, keep, drop });
}

console.log(`rows changing: ${plan.length}`);
console.log(`images dropped: ${plan.reduce((s,p)=>s+p.drop.length,0)}`);
console.log(`rows ending with 0 images:`, plan.filter(p=>p.now===0).map(p=>p.title));

writeFileSync("/tmp/dinner-plan.json", JSON.stringify(plan,null,2));
const sql = plan.filter(p=>p.now>0).map(p=>{
  const arr = "ARRAY[" + p.keep.map(u=>`'${u.replace(/'/g,"''")}'`).join(",") + "]";
  return `UPDATE inventory_items SET images=${arr}, updated_at=now() WHERE rms_id='${p.rms_id}';`;
}).join("\n");
writeFileSync("/tmp/dinner-plan.sql", sql);

console.log("\nsample (first 30):");
plan.slice(0,30).forEach(p=>console.log(`  ${p.title.padEnd(50)} ${p.was} → ${p.now}`));
