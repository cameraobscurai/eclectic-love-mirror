import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import xlsx from 'xlsx';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const wb = xlsx.readFile('/tmp/current_inventory.xlsx');
const rows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

const CAT = {
  'Tableware':'tableware','Pillows':'pillows-throws','Throws':'pillows-throws',
  'Seating':'seating','Styling':'styling','Tables':'tables','Serveware':'serveware',
  'Bars':'bars','Large Decor & Dividers':'large-decor','Lighting':'lighting',
  'Rugs':'rugs','Candlelight':'candlelight','Chandeliers':'chandeliers',
  'Storage':'storage','Furs & Pelts':'furs-pelts','Subrentals':'subrentals',
};
const PUBLIC = new Set(Object.values(CAT).filter(c=>c!=='subrentals'));
const slugify = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'item';
const DIM = /(\d+(?:\.\d+)?)\s*(['"])\s*([WDH])/gi;
function parseDims(s) {
  if (!s) return [null,null,null];
  const o = {W:null,D:null,H:null};
  let m;
  while ((m = DIM.exec(s))) {
    const n = parseFloat(m[1]);
    const inches = m[2] === "'" ? n*12 : n;
    const cm = Math.round(inches*2.54*10)/10;
    const a = m[3].toUpperCase();
    if (o[a] == null) o[a] = cm;
  }
  return [o.W,o.D,o.H];
}

const records = rows.map(r => {
  const rms_id = String(r['Id']);
  const name = String(r['Name']).trim();
  const group = String(r['Product Group']).trim();
  const cat = CAT[group] || slugify(group);
  const status = PUBLIC.has(cat) ? 'available' : 'draft';
  const stock = r['Current Stock'];
  const isNum = typeof stock === 'number' && !Number.isNaN(stock);
  const dims_raw = r['(W" x D" x H") Dims'] || null;
  const [w,d,h] = parseDims(dims_raw);
  return {
    rms_id, title: name, slug: `${slugify(name)}-${rms_id}`,
    category: cat, status,
    quantity: isNum ? Math.trunc(stock) : null,
    quantity_label: isNum ? null : (stock != null ? String(stock) : null),
    dimensions_raw: dims_raw,
    width_cm: w, depth_cm: d, height_cm: h,
    images: [],
  };
});

console.log('records:', records.length);

// First soft-delete legacy rows
const { error: delErr } = await sb.from('inventory_items').update({ status: 'draft' }).is('rms_id', null).neq('status', 'draft');
if (delErr) { console.error('soft-delete error', delErr); process.exit(1); }

// Upsert in chunks of 200
const CHUNK = 200;
let total = 0;
for (let i = 0; i < records.length; i += CHUNK) {
  const part = records.slice(i, i + CHUNK);
  const { error, count } = await sb.from('inventory_items').upsert(part, { onConflict: 'rms_id', count: 'exact' });
  if (error) { console.error('upsert error chunk', i, error); process.exit(1); }
  total += part.length;
  console.log('upserted', total);
}
const { count: finalCount } = await sb.from('inventory_items').select('*', { count: 'exact', head: true }).not('rms_id','is',null);
console.log('total rows with rms_id in db:', finalCount);
