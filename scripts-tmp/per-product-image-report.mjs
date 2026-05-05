// Per-product image report.
// Columns:
//   rms_id, title, category, status_class, current_hero_url, current_hero_path,
//   current_in_storage, current_dupe_count, proposed_hero_url, proposed_source,
//   proposed_confidence, notes
//
// status_class:
//   IMAGELESS               — no hero today
//   UNIQUE                  — hero used by only this product (keep)
//   SHARED_KEEP             — hero shared, classified as legit variant family
//   SHARED_BREAK            — hero shared, false dupe (Phase B candidate)
//
// proposed_source:
//   keep_current            — current hero is correct, no change
//   storage_exact           — basename token-match in same category folder
//   storage_exact_other_cat — token-match found in a different folder
//   squarespace_exact_title — exact site product title match → cdn_image_urls[0]
//   none                    — no honest candidate
//
// Outputs:
//   scripts-tmp/per-product-image-report.json   (full)
//   scripts-tmp/per-product-image-report.csv    (Excel-friendly)
//   scripts-tmp/per-product-image-report.txt    (top-line summary)

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})
const OUT = (n) => path.resolve(`scripts-tmp/${n}`)
const PUB = (p) => `https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/inventory/${p.split('/').map(encodeURIComponent).join('/')}`

// ---------- normalization ----------
const STOP = new Set(['the','a','an','of','and','with','to','for','in','on'])
function stripExt(s){return s.replace(/\.[a-z0-9]{2,5}$/i,'')}
function norm(s){
  if(!s) return ''
  let t=String(s);try{t=decodeURIComponent(t)}catch{}
  return stripExt(t).toLowerCase()
    .replace(/[_\\-]+/g,' ').replace(/[()'"]/g,' ')
    .replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim()
}
function tokens(s){ return norm(s).split(' ').filter(t=>t.length>=3 && !STOP.has(t)) }
const CATEGORY_FOLDER = {
  'pillows-throws':['PILLOWS','THROWS'],
  'tableware':['TABLEWEAR'],
  'serveware':['SERVEWARE'],
  'seating':['SEATING'],
  'tables':['TABLES'],
  'bars':['BARS'],
  'large-decor':['LARGE-DECOR'],
  'lighting':['LIGHTING'],
  'rugs':['RUGS'],
  'candlelight':['CANDLELIGHT'],
  'chandeliers':['CHANDELIERS','LIGHTING'],
  'styling':['STYLING'],
  'storage':['STORAGE'],
  'furs-pelts':['FURS','PELTS','THROWS'],
}
function inProductCategory(filePath, category){
  const folders = CATEGORY_FOLDER[category] || []
  return folders.some(f => filePath.toUpperCase().startsWith(`${f}/`) || filePath.toUpperCase().includes(`/${f}/`))
}

// ---------- load ----------
const { data: products, error } = await sb.from('inventory_items')
  .select('rms_id,title,category,status,images')
  .eq('status','available').not('rms_id','is',null)
if (error) throw error

async function listAll(prefix=''){
  const out=[]; let offset=0
  while(true){
    const {data,error}=await sb.storage.from('inventory').list(prefix,{limit:1000,offset,sortBy:{column:'name',order:'asc'}})
    if(error) throw error
    if(!data?.length) break
    for(const e of data){
      const full=prefix?`${prefix}/${e.name}`:e.name
      if(e.id===null) out.push(...await listAll(full))
      else out.push(full)
    }
    if(data.length<1000) break
    offset+=1000
  }
  return out
}
const storageFiles = (await listAll('')).filter(p=>!p.endsWith('.lovkeep'))
const storageSet = new Set(storageFiles)

const siteProducts = JSON.parse(fs.readFileSync(OUT('owner-site-products.json'),'utf8'))
const siteByNormTitle = new Map()
for (const sp of siteProducts){
  const k = norm(sp.title)
  if (k && !siteByNormTitle.has(k)) siteByNormTitle.set(k, sp)
}

// ---------- shared-hero classification (mirror audit script) ----------
const byHero = new Map()
for (const r of products){
  const h = r.images?.[0] ?? null
  if (!h) continue
  if (!byHero.has(h)) byHero.set(h, [])
  byHero.get(h).push(r)
}
function classify(filePath, members){
  const fname = filePath.split('/').pop() || ''
  const cats = new Set(members.map(m=>m.category))
  if (/\bset\.[a-z0-9]+$/i.test(fname)) return 'KEEP'
  if (/(plinth|banquette|column|cocktail column)/i.test(fname)) return 'KEEP'
  const firstTokens = members.map(m=>norm(m.title).split(' ')[0])
  const allSame = firstTokens.every(t=>t===firstTokens[0])
  if (allSame && members.length<=6 &&
      [...cats].every(c=>['tableware','serveware','bars','tables','seating'].includes(c)) &&
      fname.toLowerCase().includes(firstTokens[0])){
    return 'KEEP'
  }
  return 'BREAK'
}
const heroClass = new Map()
for (const [hero, members] of byHero){
  if (members.length<2) continue
  const fp = hero.replace(/^.*\/inventory\//,'')
  heroClass.set(hero, classify(fp, members))
}

// ---------- propose for one product ----------
function proposeStorage(product){
  const titleToks = new Set(tokens(product.title))
  if (!titleToks.size) return null
  // 1. same category folder, all distinctive filename tokens present in title
  const sameCat = storageFiles.filter(p=>inProductCategory(p, product.category))
  for (const f of sameCat){
    const fname = f.split('/').pop()
    const ftoks = tokens(fname)
    if (!ftoks.length) continue
    if (ftoks.every(t=>titleToks.has(t)) && ftoks.length>=2){
      return { url: PUB(f), source:'storage_exact', conf:'high', path:f }
    }
  }
  // 2. relax: 2+ distinctive token overlap, same category folder, exclusive (no other product matches better)
  let best=null, bestScore=0
  for (const f of sameCat){
    const ftoks = tokens(f.split('/').pop())
    if (ftoks.length<2) continue
    const overlap = ftoks.filter(t=>titleToks.has(t)).length
    if (overlap>=2 && overlap>bestScore){ best=f; bestScore=overlap }
  }
  if (best){
    return { url: PUB(best), source:'storage_partial', conf:'medium', path:best }
  }
  return null
}
function proposeSquarespace(product){
  const sp = siteByNormTitle.get(norm(product.title))
  if (!sp || !sp.cdn_image_urls?.length) return null
  return { url: sp.cdn_image_urls[0], source:'squarespace_exact_title', conf:'high', path:null }
}

// ---------- build report ----------
const rows = products.map(p=>{
  const hero = p.images?.[0] ?? null
  const heroPath = hero ? hero.replace(/^.*\/inventory\//,'') : null
  const heroExists = heroPath ? storageSet.has(heroPath) : null
  const dupes = hero ? (byHero.get(hero)?.length ?? 1) : 0

  let status_class = 'IMAGELESS'
  if (hero){
    if (dupes===1) status_class='UNIQUE'
    else status_class = heroClass.get(hero)==='KEEP' ? 'SHARED_KEEP' : 'SHARED_BREAK'
  }

  // Propose only when current is wrong/missing
  let proposal = null
  if (status_class==='SHARED_BREAK' || status_class==='IMAGELESS'){
    proposal = proposeStorage(p) || proposeSquarespace(p)
  } else {
    proposal = { url: hero, source:'keep_current', conf:'n/a', path:heroPath }
  }

  return {
    rms_id: p.rms_id,
    title: p.title,
    category: p.category,
    status_class,
    current_hero_url: hero,
    current_hero_path: heroPath,
    current_in_storage: heroExists,
    current_dupe_count: dupes,
    proposed_hero_url: proposal?.url ?? null,
    proposed_source: proposal?.source ?? 'none',
    proposed_confidence: proposal?.conf ?? 'none',
  }
})

// ---------- summary ----------
const counts = {}
const by = (k,v)=>{ counts[k]=counts[k]||{}; counts[k][v]=(counts[k][v]||0)+1 }
for (const r of rows){
  by('status_class', r.status_class)
  by('proposed_source', r.proposed_source)
  if (r.current_in_storage===false) by('flag','current_hero_missing_from_storage')
}

// ---------- write ----------
fs.writeFileSync(OUT('per-product-image-report.json'), JSON.stringify(rows, null, 2))

// CSV
function csvCell(v){
  if (v===null||v===undefined) return ''
  const s = String(v)
  return /["\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s
}
const cols = ['rms_id','title','category','status_class','current_hero_url','current_hero_path','current_in_storage','current_dupe_count','proposed_hero_url','proposed_source','proposed_confidence']
const csv = [cols.join(',')]
for (const r of rows) csv.push(cols.map(c=>csvCell(r[c])).join(','))
fs.writeFileSync(OUT('per-product-image-report.csv'), csv.join('\n'))

// Top-line text
const lines=[]
lines.push('PER-PRODUCT IMAGE REPORT')
lines.push(`Generated: ${new Date().toISOString()}`)
lines.push(`Total public products: ${rows.length}`)
lines.push('')
lines.push('By status_class:')
for (const [k,n] of Object.entries(counts.status_class).sort((a,b)=>b[1]-a[1])) lines.push(`  ${k.padEnd(14)} ${n}`)
lines.push('')
lines.push('By proposed_source:')
for (const [k,n] of Object.entries(counts.proposed_source).sort((a,b)=>b[1]-a[1])) lines.push(`  ${k.padEnd(28)} ${n}`)
lines.push('')
lines.push('Flags:')
for (const [k,n] of Object.entries(counts.flag||{})) lines.push(`  ${k}: ${n}`)
lines.push('')
lines.push('Files written:')
lines.push('  scripts-tmp/per-product-image-report.json')
lines.push('  scripts-tmp/per-product-image-report.csv')
const summary = lines.join('\n')
fs.writeFileSync(OUT('per-product-image-report.txt'), summary)
console.log(summary)
