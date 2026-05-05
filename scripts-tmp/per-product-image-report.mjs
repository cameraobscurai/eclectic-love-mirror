// Per-product image report (v2 — with correct storage URL detection)
//
// Reality discovered in audit:
//   • Bucket is `inventory`. Object paths inside the bucket are either
//     `inventory/<FOLDER>/file.png`  (owner-uploaded tree)
//     `_squarespace/<hash>_file.png` (auto-mirrored squarespace assets)
//   • Public URL = .../public/<bucket>/<object_path>
//     so correct URLs look like
//       /public/inventory/inventory/PILLOWS/Blue Green Lumbar.png
//       /public/inventory/_squarespace/d568...png
//   • 758 of 808 product URLs in the DB are missing the second `inventory/`
//     and currently 400. Fixable purely by URL prefix repair.
//
// Output columns:
//   rms_id, title, category, status_class, current_hero_url,
//   current_object_path_guess, current_in_storage, current_dupe_count,
//   proposed_hero_url, proposed_object_path, proposed_source,
//   proposed_confidence, repair_kind
//
// status_class:  IMAGELESS | UNIQUE | SHARED_KEEP | SHARED_BREAK
// repair_kind:
//   none                     — image is fine OR no proposal exists
//   url_prefix_fix           — same image, just inject the missing `inventory/`
//   rebind_to_other_storage  — point to a different storage object (best match)
//   rebind_to_squarespace    — point to a Squarespace CDN URL
//
// Outputs:
//   scripts-tmp/per-product-image-report.json
//   scripts-tmp/per-product-image-report.csv
//   scripts-tmp/per-product-image-report.txt

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})
const OUT = (n) => path.resolve(`scripts-tmp/${n}`)
const BASE = `${process.env.SUPABASE_URL}/storage/v1/object/public/inventory/`
const enc = (p) => p.split('/').map(encodeURIComponent).join('/')
const toUrl = (objectPath) => `${BASE}${enc(objectPath)}`

// ---------- normalization ----------
const STOP = new Set(['the','a','an','of','and','with','to','for','in','on'])
function stripExt(s){return s.replace(/\.[a-z0-9]{2,5}$/i,'')}
function norm(s){
  if(!s) return ''
  let t=String(s);try{t=decodeURIComponent(t)}catch{}
  return stripExt(t).toLowerCase()
    .replace(/[_\-]+/g,' ').replace(/[()'"]/g,' ')
    .replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim()
}
function tokens(s){ return norm(s).split(' ').filter(t=>t.length>=3 && !STOP.has(t)) }
const CATEGORY_FOLDER = {
  'pillows-throws':['inventory/PILLOWS','inventory/THROWS'],
  'tableware':['inventory/TABLEWEAR'],
  'serveware':['inventory/SERVEWARE'],
  'seating':['inventory/SEATING'],
  'tables':['inventory/TABLES'],
  'bars':['inventory/BARS'],
  'large-decor':['inventory/LARGE-DECOR'],
  'lighting':['inventory/LIGHTING'],
  'rugs':['inventory/RUGS'],
  'candlelight':['inventory/CANDLELIGHT'],
  'chandeliers':['inventory/CHANDELIERS','inventory/LIGHTING'],
  'styling':['inventory/STYLING'],
  'storage':['inventory/STORAGE'],
  'furs-pelts':['inventory/FURS','inventory/PELTS','inventory/THROWS'],
}
function inProductCategory(p, category){
  const folders = CATEGORY_FOLDER[category] || []
  return folders.some(f => p.startsWith(`${f}/`) || p.includes(`/${f.split('/').pop()}/`))
}

// ---------- pull live state ----------
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
const storageObjects = (await listAll('')).filter(p=>!p.endsWith('.lovkeep'))
const storageSet = new Set(storageObjects)

const siteProducts = JSON.parse(fs.readFileSync(OUT('owner-site-products.json'),'utf8'))
const siteByNormTitle = new Map()
for (const sp of siteProducts){
  const k = norm(sp.title)
  if (k && !siteByNormTitle.has(k)) siteByNormTitle.set(k, sp)
}

// ---------- group by current hero (for shared classification) ----------
const byHero = new Map()
for (const r of products){
  const h = r.images?.[0] ?? null
  if (!h) continue
  if (!byHero.has(h)) byHero.set(h, [])
  byHero.get(h).push(r)
}
function classifyShared(filePath, members){
  const fname = filePath.split('/').pop() || ''
  const cats = new Set(members.map(m=>m.category))
  if (/\bset\.[a-z0-9]+$/i.test(fname)) return 'KEEP'
  if (/(plinth|banquette|column)/i.test(fname)) return 'KEEP'
  const firstTokens = members.map(m=>norm(m.title).split(' ')[0])
  const allSame = firstTokens.every(t=>t===firstTokens[0])
  if (allSame && members.length<=6 &&
      [...cats].every(c=>['tableware','serveware','bars','tables','seating'].includes(c)) &&
      fname.toLowerCase().includes(firstTokens[0])) return 'KEEP'
  return 'BREAK'
}
const heroClass = new Map()
for (const [hero, members] of byHero){
  if (members.length<2) continue
  const fp = hero.replace(/^.*\/public\/inventory\//,'')
  heroClass.set(hero, classifyShared(fp, members))
}

// ---------- helpers ----------
function urlToObjectPath(url){
  if (!url) return null
  const m = url.match(/\/public\/inventory\/(.+)$/)
  if (!m) return null
  try { return decodeURIComponent(m[1]) } catch { return m[1] }
}
function existsInStorage(objectPath){ return objectPath ? storageSet.has(objectPath) : false }
function tryPrefixRepair(objectPath){
  if (!objectPath) return null
  if (storageSet.has(objectPath)) return objectPath          // already correct
  const candidates = [
    `inventory/${objectPath}`,                                // missing inventory/ prefix (the 758 case)
  ]
  for (const c of candidates) if (storageSet.has(c)) return c
  return null
}

function proposeStorage(product){
  const titleToks = new Set(tokens(product.title))
  if (!titleToks.size) return null
  const sameCat = storageObjects.filter(p=>inProductCategory(p, product.category))
  // 1. all distinctive filename tokens present in title
  for (const f of sameCat){
    const ftoks = tokens(f.split('/').pop())
    if (ftoks.length>=2 && ftoks.every(t=>titleToks.has(t))){
      return { objectPath:f, source:'storage_exact', conf:'high' }
    }
  }
  // 2. best partial overlap >=2
  let best=null, bestScore=0
  for (const f of sameCat){
    const ftoks = tokens(f.split('/').pop())
    if (ftoks.length<2) continue
    const overlap = ftoks.filter(t=>titleToks.has(t)).length
    if (overlap>=2 && overlap>bestScore){ best=f; bestScore=overlap }
  }
  if (best) return { objectPath:best, source:'storage_partial', conf:'medium' }
  return null
}
function proposeSquarespace(product){
  const sp = siteByNormTitle.get(norm(product.title))
  if (!sp || !sp.cdn_image_urls?.length) return null
  return { url: sp.cdn_image_urls[0], source:'squarespace_exact_title', conf:'high' }
}

// ---------- build rows ----------
const rows = products.map(p=>{
  const hero = p.images?.[0] ?? null
  const objectPathGuess = urlToObjectPath(hero)
  const heroExists = existsInStorage(objectPathGuess)
  const dupes = hero ? (byHero.get(hero)?.length ?? 1) : 0

  let status_class = 'IMAGELESS'
  if (hero){
    if (dupes===1) status_class='UNIQUE'
    else status_class = heroClass.get(hero)==='KEEP' ? 'SHARED_KEEP' : 'SHARED_BREAK'
  }

  // Decide proposal
  let proposed_hero_url=null, proposed_object_path=null, proposed_source='none', proposed_confidence='none', repair_kind='none'

  if (status_class==='SHARED_BREAK' || status_class==='IMAGELESS'){
    // Need a different image
    const sProp = proposeStorage(p)
    if (sProp){
      proposed_object_path = sProp.objectPath
      proposed_hero_url = toUrl(sProp.objectPath)
      proposed_source = sProp.source
      proposed_confidence = sProp.conf
      repair_kind = 'rebind_to_other_storage'
    } else {
      const sqs = proposeSquarespace(p)
      if (sqs){
        proposed_hero_url = sqs.url
        proposed_source = sqs.source
        proposed_confidence = sqs.conf
        repair_kind = 'rebind_to_squarespace'
      }
    }
  } else if (hero && !heroExists){
    // URL points to a non-existent path — try the prefix repair
    const fixed = tryPrefixRepair(objectPathGuess)
    if (fixed){
      proposed_object_path = fixed
      proposed_hero_url = toUrl(fixed)
      proposed_source = 'url_prefix_fix'
      proposed_confidence = 'high'
      repair_kind = 'url_prefix_fix'
    } else {
      // Image truly missing from storage
      const sProp = proposeStorage(p)
      if (sProp){
        proposed_object_path = sProp.objectPath
        proposed_hero_url = toUrl(sProp.objectPath)
        proposed_source = sProp.source
        proposed_confidence = sProp.conf
        repair_kind = 'rebind_to_other_storage'
      } else {
        const sqs = proposeSquarespace(p)
        if (sqs){
          proposed_hero_url = sqs.url
          proposed_source = sqs.source
          proposed_confidence = sqs.conf
          repair_kind = 'rebind_to_squarespace'
        }
      }
    }
  } else {
    proposed_hero_url = hero
    proposed_object_path = objectPathGuess
    proposed_source = 'keep_current'
    proposed_confidence = 'n/a'
    repair_kind = 'none'
  }

  return {
    rms_id: p.rms_id,
    title: p.title,
    category: p.category,
    status_class,
    current_hero_url: hero,
    current_object_path_guess: objectPathGuess,
    current_in_storage: heroExists,
    current_dupe_count: dupes,
    proposed_hero_url,
    proposed_object_path,
    proposed_source,
    proposed_confidence,
    repair_kind,
  }
})

// ---------- counts ----------
const counts = {}
const by = (k,v)=>{ counts[k]=counts[k]||{}; counts[k][v]=(counts[k][v]||0)+1 }
for (const r of rows){
  by('status_class', r.status_class)
  by('repair_kind', r.repair_kind)
  by('proposed_source', r.proposed_source)
  if (r.current_hero_url && !r.current_in_storage) by('flag','current_url_404')
}
const breakUnfixable = rows.filter(r=>r.status_class==='SHARED_BREAK' && r.repair_kind==='none').length
const imagelessUnfixable = rows.filter(r=>r.status_class==='IMAGELESS' && r.repair_kind==='none').length

// ---------- write ----------
fs.writeFileSync(OUT('per-product-image-report.json'), JSON.stringify(rows,null,2))

function csvCell(v){ if(v==null) return ''; const s=String(v); return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s }
const cols = ['rms_id','title','category','status_class','current_hero_url','current_object_path_guess','current_in_storage','current_dupe_count','proposed_hero_url','proposed_object_path','proposed_source','proposed_confidence','repair_kind']
const csv = [cols.join(',')]
for (const r of rows) csv.push(cols.map(c=>csvCell(r[c])).join(','))
fs.writeFileSync(OUT('per-product-image-report.csv'), csv.join('\n'))

const lines=[]
lines.push('PER-PRODUCT IMAGE REPORT (v2 — with URL repair detection)')
lines.push(`Generated: ${new Date().toISOString()}`)
lines.push('')
lines.push(`Total public products:                       ${rows.length}`)
lines.push(`Storage objects scanned:                     ${storageObjects.length}`)
lines.push('')
lines.push('STATUS_CLASS (current state of hero binding)')
for (const [k,n] of Object.entries(counts.status_class).sort((a,b)=>b[1]-a[1])) lines.push(`  ${k.padEnd(14)} ${n}`)
lines.push('')
lines.push('REPAIR_KIND (proposed action per product)')
for (const [k,n] of Object.entries(counts.repair_kind).sort((a,b)=>b[1]-a[1])) lines.push(`  ${k.padEnd(28)} ${n}`)
lines.push('')
lines.push('PROPOSED_SOURCE')
for (const [k,n] of Object.entries(counts.proposed_source).sort((a,b)=>b[1]-a[1])) lines.push(`  ${k.padEnd(28)} ${n}`)
lines.push('')
lines.push('FLAGS')
for (const [k,n] of Object.entries(counts.flag||{})) lines.push(`  ${k}: ${n}`)
lines.push('')
lines.push('UNFIXABLE (no honest candidate found, will stay imageless after repair):')
lines.push(`  SHARED_BREAK with no proposal: ${breakUnfixable}`)
lines.push(`  IMAGELESS with no proposal:    ${imagelessUnfixable}`)
lines.push('')
lines.push('Files written:')
lines.push('  scripts-tmp/per-product-image-report.json')
lines.push('  scripts-tmp/per-product-image-report.csv')

const summary=lines.join('\n')
fs.writeFileSync(OUT('per-product-image-report.txt'), summary)
console.log(summary)
