// Tableware-specific cleaner.
// Pattern: each piece variant (e.g. "X Dinner Fork") carries the entire family's
// gallery (set + every piece). Keep: (a) set/group photos, (b) photos whose
// filename matches THIS row's piece keyword. Drop photos that match a DIFFERENT
// piece keyword.
//
// Also runs perceptual dedup (dHash, hamming<=5) as a backstop.

import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const PIECE_TOKENS = [
  "salad fork","dinner fork","steak knife","butter knife","dinner knife",
  "dinner spoon","tea spoon","teaspoon","soup spoon","dessert spoon",
  "dessert fork","fish fork","fish knife","cake fork","serving spoon",
  "serving fork","ladle","carving knife","carving fork","bread knife",
  "cheese knife","fruit knife","cocktail fork","oyster fork","ice cream spoon",
];
const SET_TOKENS = ["set","collection","flatware","silverware","cutlery","group"];

function normalize(s) {
  return s.toLowerCase().replace(/[_\-%20\+]/g, " ").replace(/\.[a-z]+$/,"").replace(/\s+/g," ").trim();
}
function urlBasename(u) {
  try { return decodeURIComponent(new URL(u).pathname.split("/").pop() || ""); } catch { return u; }
}
function tokensIn(text) {
  const n = " " + normalize(text) + " ";
  return PIECE_TOKENS.filter(t => n.includes(" " + t + " ") || n.includes(t.replace(" ","")));
}
function isSetPhoto(text) {
  const n = " " + normalize(text) + " ";
  return SET_TOKENS.some(t => n.includes(" " + t + " "));
}

const rows = readFileSync("/tmp/tableware.tsv","utf8").trim().split("\n").map(l => {
  const [rms_id, title, joined] = l.split("\t");
  return { rms_id, title, images: (joined||"").split("|||").filter(Boolean) };
});

// ---- pass 1: name-based filter
const nameFindings = [];
for (const r of rows) {
  const ownPieces = tokensIn(r.title);
  if (ownPieces.length === 0) continue; // not a clear piece variant
  const keep = [];
  const drop = [];
  for (const u of r.images) {
    const fn = urlBasename(u);
    if (isSetPhoto(fn)) { keep.push(u); continue; }
    const fnPieces = tokensIn(fn);
    if (fnPieces.length === 0) { keep.push(u); continue; } // generic, keep
    // if filename's piece overlaps own piece → keep, else drop
    const overlap = fnPieces.some(p => ownPieces.includes(p));
    if (overlap) keep.push(u); else drop.push({ url: u, fnPieces });
  }
  if (drop.length) nameFindings.push({ ...r, ownPieces, keep, drop });
}

console.log(`name-based: ${nameFindings.length} rows would change, ${nameFindings.reduce((s,f)=>s+f.drop.length,0)} images dropped`);

// ---- pass 2: perceptual dedup on the surviving keep[] for those rows
async function dhash(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const raw = await sharp(buf,{failOn:"none"}).greyscale().resize(9,8,{fit:"fill"}).raw().toBuffer();
    let h = 0n;
    for (let y=0;y<8;y++) for (let x=0;x<8;x++) {
      h = (h<<1n) | (raw[y*9+x] > raw[y*9+x+1] ? 1n : 0n);
    }
    return h.toString(16).padStart(16,"0");
  } catch { return null; }
}
function hamming(a,b){ let x=BigInt("0x"+a)^BigInt("0x"+b),c=0; while(x){c+=Number(x&1n);x>>=1n;} return c; }

// also run perceptual on rows we didn't touch (catch unrelated dupes)
const allTargets = new Map(nameFindings.map(f=>[f.rms_id,f.keep]));
for (const r of rows) if (!allTargets.has(r.rms_id)) allTargets.set(r.rms_id, r.images);

const tasks = [];
for (const [rid, urls] of allTargets) urls.forEach((u,i) => tasks.push({ rid, i, u }));
console.log(`hashing ${tasks.length} images…`);

const results = new Array(tasks.length);
let cur=0, done=0;
await Promise.all(Array.from({length:24},async()=>{
  while(cur<tasks.length){ const i=cur++; results[i] = await dhash(tasks[i].u); done++;
    if(done%50===0) process.stderr.write(`\r  ${done}/${tasks.length}`); }
}));
process.stderr.write(`\r  ${done}/${tasks.length}\n`);

const byRid = new Map();
results.forEach((h,i)=>{
  const t = tasks[i];
  if (!byRid.has(t.rid)) byRid.set(t.rid, []);
  byRid.get(t.rid)[t.i] = { url: t.u, h };
});

const finalPlan = []; // { rms_id, finalImages, droppedTotal }
const titleByRid = new Map(rows.map(r=>[r.rms_id,r.title]));
for (const [rid, arr] of byRid) {
  const seen = [];
  const keep = [];
  for (const x of arr) {
    if (!x) continue;
    if (!x.h) { keep.push(x.url); continue; } // can't hash, keep
    const dup = seen.find(s => hamming(s,x.h) <= 5);
    if (dup) continue;
    seen.push(x.h);
    keep.push(x.url);
  }
  const orig = rows.find(r=>r.rms_id===rid).images;
  if (keep.length !== orig.length) {
    finalPlan.push({ rms_id: rid, title: titleByRid.get(rid), originalCount: orig.length, finalCount: keep.length, finalImages: keep });
  }
}

console.log(`final plan: ${finalPlan.length} rows changing`);
console.log(`total images dropped: ${finalPlan.reduce((s,f)=>s+(f.originalCount-f.finalCount),0)}`);

writeFileSync("/tmp/tableware-plan.json", JSON.stringify(finalPlan,null,2));

// build SQL
const sql = finalPlan.map(p => {
  const arr = "ARRAY[" + p.finalImages.map(u=>`'${u.replace(/'/g,"''")}'`).join(",") + "]";
  return `UPDATE inventory_items SET images=${arr}, updated_at=now() WHERE rms_id='${p.rms_id}';`;
}).join("\n");
writeFileSync("/tmp/tableware-plan.sql", sql);
console.log("→ /tmp/tableware-plan.json, /tmp/tableware-plan.sql");

// preview top changes
console.log("\nsample (first 10):");
for (const p of finalPlan.slice(0,10)) console.log(`  ${p.title}: ${p.originalCount} → ${p.finalCount}`);
