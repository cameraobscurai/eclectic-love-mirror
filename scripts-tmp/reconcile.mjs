// Reconciliation pass — generates three review manifests + Monroe cluster + unmatched-site analysis.
// Inputs:
//   scripts-tmp/image-binding-manifest.json  (output of build-image-manifest.mjs)
//   scripts-tmp/owner-site-products.json
//   /tmp/current_inventory.xlsx
//   inventory_items table
// Outputs:
//   scripts-tmp/reconcile-apply-safe.json
//   scripts-tmp/reconcile-review-required.json
//   scripts-tmp/reconcile-conflicts.json
//   scripts-tmp/reconcile-monroe.json
//   scripts-tmp/reconcile-unmatched-site.json
//   scripts-tmp/reconcile-summary.txt
// NO DB or storage writes.

import { createClient } from '@supabase/supabase-js'
import xlsx from 'xlsx'
import fs from 'node:fs'
import path from 'node:path'

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})
const OUT = (n) => path.resolve(`scripts-tmp/${n}`)

// --- normalization (same rules as builder) ---
const SIZE_TOKENS = new Set(['single','double','triple','small','medium','large','xl','sm','md','lg','s','m','l'])
const STOPWORDS = new Set(['bar','table','chair','sofa','lamp','rug','pillow','throw','vase','bowl','plate','glass','gold','black','white','wood','metal','square','round','oval','tall','short','with','and'])
function stripExt(s){return s.replace(/\.[a-z0-9]{2,5}$/i,'')}
function normalizeKey(s){
  if(!s)return''
  let t=String(s);try{t=decodeURIComponent(t)}catch{}
  t=stripExt(t).toLowerCase()
   .replace(/[_\-]+/g,' ').replace(/[()]/g,' ').replace(/['"`]/g,'')
   .replace(/\d+(\.\d+)?\s*(?:in|inch|inches|ft|feet|cm|mm)\b/g,' ')
   .replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim()
   .replace(/\s+\d{1,3}$/,'').trim()
  return t.split(' ').filter(p=>p&&!SIZE_TOKENS.has(p)).join(' ')
}
function tokens(s){return new Set(normalizeKey(s).split(' ').filter(t=>t.length>=3))}
function distinctive(s){return [...tokens(s)].filter(t=>!STOPWORDS.has(t))}

// --- load everything ---
const manifest = JSON.parse(fs.readFileSync(OUT('image-binding-manifest.json'),'utf8'))
const siteProducts = JSON.parse(fs.readFileSync(OUT('owner-site-products.json'),'utf8'))
const wb = xlsx.readFile('/tmp/current_inventory.xlsx')
const xlsxRows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])
const xlsxByRms = new Map(xlsxRows.map(r=>[String(r['Id']),{
  name:String(r['Name']??'').trim(),
  image_url:r['Image Url']??null,
  group:String(r['Product Group']??'').trim(),
}]))
const { data: dbRows } = await sb.from('inventory_items')
  .select('rms_id,title,category,status').not('rms_id','is',null)
const dbByRms = new Map(dbRows.map(r=>[r.rms_id,r]))
const publicRows = dbRows.filter(r=>r.status==='available')

function extractFilename(u){
  if(!u)return null
  const m=String(u).match(/\/original\/([^?]+)(?:\?|$)/)
  if(m){try{return decodeURIComponent(m[1])}catch{return m[1]}}
  try{return decodeURIComponent(new URL(u).pathname.split('/').pop()||'')}catch{return null}
}

// --- reclassify each binding into one of three buckets ---
const APPLY_SAFE=[], REVIEW=[], CONFLICTS=[]

for (const r of publicRows) {
  const b = manifest.bindings[r.rms_id]
  const x = xlsxByRms.get(r.rms_id)
  const csvFilename = extractFilename(x?.image_url)
  const csvKey = normalizeKey(csvFilename||'')
  const titleKey = normalizeKey(r.title)

  if (!b) {
    REVIEW.push({
      product_id: r.rms_id, product_name: r.title, category: r.category,
      rms_image_filename: csvFilename, csv_key: csvKey, title_key: titleKey,
      reason: 'no binding from either pass',
    })
    continue
  }

  // Conflict check: csv filename exists, was used (filename source), but its key differs sharply from title
  const sourceUsesFilename = b.source.includes('filename')
  const csvVsTitleAgree = csvKey && titleKey && (
    csvKey===titleKey ||
    csvKey.split(' ').some(t=>t.length>=4 && titleKey.includes(t)) ||
    titleKey.split(' ').some(t=>t.length>=4 && csvKey.includes(t))
  )

  if (sourceUsesFilename && csvKey && !csvVsTitleAgree) {
    // CSV filename and RMS title disagree — this is the Monroe-style hazard
    CONFLICTS.push({
      product_id: r.rms_id, product_name: r.title, category: r.category,
      csv_original_filename: csvFilename,
      storage_candidate: b.primary,
      squarespace_candidate: b.gallery?.find(u=>u.includes('squarespace-cdn')) ?? null,
      site_title: b.site_title ?? null,
      conflict_reason: `CSV filename "${csvFilename}" normalizes to "${csvKey}" but title is "${r.title}" (key "${titleKey}") — names disagree`,
      recommended_resolution: 'manual cluster review (likely Monroe/Astaire-class rename)',
    })
    continue
  }

  // High-confidence safe categories
  const conf = b.confidence
  const isSafeFilename = b.source==='filename' && (conf==='exact'||conf==='contains')
  const isSafeFilenameSqs = b.source==='filename+squarespace' && (conf==='exact'||conf==='contains')
  const isSafeSqsExact = b.source==='squarespace' && (conf==='exact'||conf==='contains')

  // Variant-family bindings: site product matched multiple RMS — if RMS title shares a distinctive
  // token with the site title, treat as safe; otherwise route to REVIEW.
  let variantOk = true
  if (b.source==='squarespace' && b.notes && b.notes.startsWith('variant family of')) {
    const siteToks = new Set(normalizeKey(b.site_title||'').split(' '))
    const rmsDistinct = distinctive(r.title)
    variantOk = rmsDistinct.some(t=>siteToks.has(t))
  }

  if ((isSafeFilename||isSafeFilenameSqs||isSafeSqsExact) && variantOk) {
    APPLY_SAFE.push({
      product_id: r.rms_id, product_name: r.title, category: r.category,
      image_source: b.source, primary_image_url: b.primary,
      gallery_image_count: Math.max(0,(b.all_images?.length??1)-1),
      match_method: b.source.includes('filename')?'filename_key':'squarespace_title',
      confidence: conf,
      site_title: b.site_title ?? null,
    })
  } else {
    REVIEW.push({
      product_id: r.rms_id, product_name: r.title, category: r.category,
      rms_image_filename: csvFilename,
      closest_storage_candidate: b.source.includes('filename')?b.primary:null,
      closest_squarespace_candidate: b.source==='squarespace'?b.primary:null,
      site_title: b.site_title ?? null,
      confidence: conf, source: b.source,
      reason: !variantOk ? 'variant-family bind: RMS title shares no distinctive token with site title'
                         : `low confidence (${conf}) from ${b.source}`,
    })
  }
}

// --- Monroe cluster ---
const monroeRms = publicRows.filter(r=>/monroe/i.test(r.title))
const monroeSite = siteProducts.filter(sp=>/monroe/i.test(sp.title||sp.slug||''))
// Astaire-named CSV filenames (the actual file the team uses)
const astaireRms = []
for (const r of publicRows) {
  const x = xlsxByRms.get(r.rms_id)
  const f = extractFilename(x?.image_url)
  if (f && /astaire/i.test(f)) astaireRms.push({ rms_id: r.rms_id, title: r.title, csv_filename: f })
}
// Storage objects with "astaire" or "monroe" in the name
const allStoragePaths = []
async function listAll(prefix=''){
  const out=[];let offset=0
  while(true){
    const {data,error}=await sb.storage.from('inventory').list(prefix,{limit:1000,offset,sortBy:{column:'name',order:'asc'}})
    if(error)throw error
    if(!data||!data.length)break
    for(const e of data){
      const full=prefix?`${prefix}/${e.name}`:e.name
      if(e.id===null) out.push(...await listAll(full))
      else out.push(full)
    }
    if(data.length<1000)break
    offset+=1000
  }
  return out
}
const storage = await listAll('')
const monroeStorage = storage.filter(p=>/monroe|astaire/i.test(p))
const monroeManifest = {
  rms_rows: monroeRms.map(r=>{
    const x=xlsxByRms.get(r.rms_id)
    return { rms_id:r.rms_id, title:r.title, category:r.category,
      csv_image_filename: extractFilename(x?.image_url) }
  }),
  astaire_or_monroe_csv_filenames: astaireRms,
  storage_files: monroeStorage,
  squarespace_products: monroeSite.map(sp=>({
    site_title: sp.title, slug: sp.slug, detail_url: sp.detail_url,
    image_count: sp.cdn_image_urls.length, hero: sp.cdn_image_urls[0],
  })),
  recommended_bindings: monroeRms.map(r=>{
    // Match storage by Single/Double/Triple + length token in title
    const mt=r.title.match(/(Single|Double|Triple).*?(\d+'?)/i)
    const want = mt ? `${mt[1]} ${mt[2]}`.toLowerCase() : null
    const storageMatch = want
      ? monroeStorage.find(p=>normalizeKey(p).replace(/\s+/g,' ').includes(want.replace(/'/g,'').toLowerCase()))
      : null
    const siteMatch = monroeSite[0]?.detail_url ?? null
    return {
      rms_id: r.rms_id, title: r.title,
      recommended_storage: storageMatch ?? null,
      recommended_site_product: siteMatch,
      confidence: storageMatch ? 'high (size-token match)' : 'manual',
    }
  }),
}

// --- 45 unmatched site products ---
const boundRmsSet = new Set(Object.keys(manifest.bindings))
const siteByTitle = new Map()
for (const sp of siteProducts) siteByTitle.set(sp.detail_url, sp)
// recompute "unmatched" using same logic as builder: sites where no RMS row got bound BY this site product
const usedSiteUrls = new Set(Object.values(manifest.bindings).map(b=>b.site_title).filter(Boolean))
const unmatchedSiteList = siteProducts.filter(sp=>{
  // Was any RMS row bound to this exact site title?
  return ![...Object.values(manifest.bindings)].some(b=>b.site_title===sp.title)
})
// For each unmatched, find closest RMS by distinctive-token Jaccard
const rmsIndex = publicRows.map(r=>({rms_id:r.rms_id,title:r.title,key:normalizeKey(r.title),tokens:new Set(normalizeKey(r.title).split(' '))}))
function closestRms(siteTitle){
  const skey=normalizeKey(siteTitle); if(!skey)return null
  const stoks=new Set(skey.split(' '))
  const sd=[...stoks].filter(t=>t.length>=4&&!STOPWORDS.has(t))
  let best=null,bestScore=0
  for (const r of rmsIndex) {
    const overlap = [...r.tokens].filter(t=>stoks.has(t)).length
    const distOverlap = sd.filter(t=>r.tokens.has(t)).length
    const score = overlap + distOverlap*2
    if (score > bestScore) { best = r; bestScore = score }
  }
  return best && bestScore>=2 ? { rms_id: best.rms_id, title: best.title, score: bestScore } : null
}
const unmatchedSiteAnalysis = unmatchedSiteList.map(sp=>({
  site_title: sp.title, site_category_path: sp.category_path,
  site_slug: sp.slug, detail_url: sp.detail_url,
  closest_rms_candidate: closestRms(sp.title||sp.slug),
  reason: 'no RMS title shared distinctive tokens above threshold',
}))

// --- write outputs ---
fs.writeFileSync(OUT('reconcile-apply-safe.json'), JSON.stringify(APPLY_SAFE,null,2))
fs.writeFileSync(OUT('reconcile-review-required.json'), JSON.stringify(REVIEW,null,2))
fs.writeFileSync(OUT('reconcile-conflicts.json'), JSON.stringify(CONFLICTS,null,2))
fs.writeFileSync(OUT('reconcile-monroe.json'), JSON.stringify(monroeManifest,null,2))
fs.writeFileSync(OUT('reconcile-unmatched-site.json'), JSON.stringify(unmatchedSiteAnalysis,null,2))

// --- recompute coverage AFTER Monroe patch (assuming all monroe recommended bindings apply) ---
const monroePatchable = monroeManifest.recommended_bindings.filter(b=>b.recommended_storage).length
const conflictsAfterMonroe = CONFLICTS.filter(c=>!/monroe/i.test(c.product_name)).length
const reviewByCat = {}
for (const r of REVIEW) reviewByCat[r.category] = (reviewByCat[r.category]||0)+1
const imagelessRms = REVIEW.filter(r=>!r.closest_storage_candidate && !r.closest_squarespace_candidate).length
const imagelessAfterMonroe = imagelessRms - monroePatchable

const lines=[]
lines.push('RECONCILIATION SUMMARY — DRY RUN, NO WRITES')
lines.push(`Generated: ${new Date().toISOString()}`)
lines.push('')
lines.push('A. APPLY_SAFE (ready for Phase 1 apply):           '+APPLY_SAFE.length)
lines.push('B. REVIEW_REQUIRED:                                 '+REVIEW.length)
lines.push('C. CONFLICTS:                                       '+CONFLICTS.length)
lines.push('   of which Monroe/Astaire cluster:                 '+CONFLICTS.filter(c=>/monroe/i.test(c.product_name)).length)
lines.push('   conflicts after Monroe patch:                    '+conflictsAfterMonroe)
lines.push('D. UNMATCHED SITE PRODUCTS:                         '+unmatchedSiteAnalysis.length)
lines.push('')
lines.push('Image-less rows (truly missing): '+imagelessRms)
lines.push('Image-less after Monroe patch:    '+imagelessAfterMonroe+'  (Monroe patchable: '+monroePatchable+')')
lines.push('')
lines.push('REVIEW by category (top 10):')
for (const [cat,n] of Object.entries(reviewByCat).sort((a,b)=>b[1]-a[1]).slice(0,10)) {
  lines.push(`   ${cat}: ${n}`)
}
lines.push('')
lines.push('--- APPLY_SAFE breakdown ---')
const safeBySource = {}
for (const a of APPLY_SAFE) safeBySource[a.image_source]=(safeBySource[a.image_source]||0)+1
for (const [k,n] of Object.entries(safeBySource)) lines.push(`   ${k}: ${n}`)
lines.push('')
lines.push('--- 5 APPLY_SAFE samples ---')
for (const a of APPLY_SAFE.slice(0,5)) lines.push(`   ${a.product_id} "${a.product_name}" [${a.category}] src=${a.image_source} conf=${a.confidence} gallery=${a.gallery_image_count}`)
lines.push('')
lines.push('--- 5 REVIEW samples (tableware first) ---')
for (const r of [...REVIEW].sort((a,b)=>(a.category==='tableware'?-1:1)).slice(0,5)) {
  lines.push(`   ${r.product_id} "${r.product_name}" [${r.category}]  reason=${r.reason}`)
}
lines.push('')
lines.push('--- 5 CONFLICT samples ---')
for (const c of CONFLICTS.slice(0,5)) {
  lines.push(`   ${c.product_id} "${c.product_name}" csv="${c.csv_original_filename}" → ${c.recommended_resolution}`)
}
lines.push('')
lines.push('--- 5 UNMATCHED SITE samples ---')
for (const u of unmatchedSiteAnalysis.slice(0,5)) {
  lines.push(`   "${u.site_title}" (${u.site_category_path}) closest=${u.closest_rms_candidate?`${u.closest_rms_candidate.rms_id}/"${u.closest_rms_candidate.title}" score=${u.closest_rms_candidate.score}`:'(none)'}`)
}
lines.push('')
lines.push('--- MONROE CLUSTER ---')
lines.push(`RMS rows: ${monroeManifest.rms_rows.length}`)
lines.push(`CSV filenames using Astaire naming: ${astaireRms.length}`)
lines.push(`Storage files matching monroe|astaire: ${monroeStorage.length}`)
lines.push(`Squarespace products: ${monroeManifest.squarespace_products.length}`)
lines.push(`Recommended bindings with storage match: ${monroePatchable} of ${monroeManifest.rms_rows.length}`)
for (const b of monroeManifest.recommended_bindings) {
  lines.push(`   ${b.rms_id} "${b.title}" → ${b.recommended_storage ?? '(no storage match)'}`)
}
lines.push('')
lines.push('Files written:')
lines.push('  scripts-tmp/reconcile-apply-safe.json')
lines.push('  scripts-tmp/reconcile-review-required.json')
lines.push('  scripts-tmp/reconcile-conflicts.json')
lines.push('  scripts-tmp/reconcile-monroe.json')
lines.push('  scripts-tmp/reconcile-unmatched-site.json')

fs.writeFileSync(OUT('reconcile-summary.txt'), lines.join('\n'))
console.log(lines.join('\n'))
