// Build image-binding manifest. Two passes:
//   PASS A — Filename-key: extract filename from each row's `Image Url` (segment between
//            /original/ and ?), normalize, match against the existing storage bucket listing.
//   PASS B — Squarespace: fuzzy-join scraped site products (scripts-tmp/owner-site-products.json)
//            to RMS rows by normalized title (1-to-many for variant families).
// Reconcile per the user's precedence rules and emit:
//   scripts-tmp/image-binding-manifest.json
//   scripts-tmp/image-binding-summary.txt   (the six numbers + spot-check examples)
// NO writes to DB or storage. Pure dry-run.

import { createClient } from '@supabase/supabase-js'
import xlsx from 'xlsx'
import fs from 'node:fs'
import path from 'node:path'

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})
const BUCKET = 'inventory'
const OUT_JSON = path.resolve('scripts-tmp/image-binding-manifest.json')
const OUT_TXT = path.resolve('scripts-tmp/image-binding-summary.txt')

// ---------- normalization ----------
const SIZE_TOKENS = new Set([
  'single', 'double', 'triple', 'small', 'medium', 'large', 'xl',
  'sm', 'md', 'lg', 's', 'm', 'l',
])
function stripExt(s) { return s.replace(/\.[a-z0-9]{2,5}$/i, '') }

function normalizeKey(s) {
  if (!s) return ''
  let t = String(s)
  t = decodeURIComponent(t)
  t = stripExt(t)
  t = t.toLowerCase()
  t = t.replace(/[_\-]+/g, ' ')           // underscores/hyphens -> space
  t = t.replace(/[()]/g, ' ')             // drop parens
  t = t.replace(/['"`]/g, '')             // drop quotes/foot/inch marks
  t = t.replace(/\d+(\.\d+)?\s*(?:in|inch|inches|ft|feet|cm|mm)\b/g, ' ') // dims
  t = t.replace(/[^a-z0-9 ]+/g, ' ')      // non-alphanum -> space
  t = t.replace(/\s+/g, ' ').trim()
  // strip trailing copy number
  t = t.replace(/\s+\d{1,3}$/, '').trim()
  // drop trailing size tokens
  const parts = t.split(' ').filter(p => p && !SIZE_TOKENS.has(p))
  return parts.join(' ')
}

function tokens(s) {
  return new Set(normalizeKey(s).split(' ').filter(t => t.length >= 3))
}

// Distinctive tokens for token-fallback (drop super-common words)
const STOPWORDS = new Set([
  'bar', 'table', 'chair', 'sofa', 'lamp', 'rug', 'pillow', 'throw', 'vase',
  'bowl', 'plate', 'glass', 'gold', 'black', 'white', 'wood', 'metal',
  'square', 'round', 'oval', 'tall', 'short', 'with', 'and',
])
function distinctiveTokens(s) {
  return [...tokens(s)].filter(t => !STOPWORDS.has(t))
}

// ---------- load XLSX (need rms_id -> Image Url and Name) ----------
const wb = xlsx.readFile('/tmp/current_inventory.xlsx')
const xlsxRows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])
const xlsxByRms = new Map()
for (const r of xlsxRows) {
  xlsxByRms.set(String(r['Id']), {
    name: String(r['Name'] ?? '').trim(),
    image_url: r['Image Url'] ?? null,
    group: String(r['Product Group'] ?? '').trim(),
  })
}
console.log(`[xlsx] ${xlsxRows.length} rows`)

// ---------- load DB rows ----------
const { data: dbRows, error: dbErr } = await sb
  .from('inventory_items')
  .select('rms_id,title,category,status')
  .not('rms_id', 'is', null)
if (dbErr) throw dbErr
const publicRows = dbRows.filter(r => r.status === 'available')
console.log(`[db] ${dbRows.length} rows total, ${publicRows.length} public`)

// ---------- list every object in the storage bucket ----------
async function listAll(prefix = '') {
  const out = []
  let offset = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await sb.storage.from(BUCKET).list(prefix, {
      limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' },
    })
    if (error) throw error
    if (!data || data.length === 0) break
    for (const e of data) {
      const full = prefix ? `${prefix}/${e.name}` : e.name
      // entries with id === null are folders (no metadata)
      if (e.id === null && (!e.metadata || Object.keys(e.metadata).length === 0)) {
        const sub = await listAll(full)
        out.push(...sub)
      } else {
        out.push(full)
      }
    }
    if (data.length < PAGE) break
    offset += PAGE
  }
  return out
}
const storagePaths = await listAll('')
console.log(`[storage] ${storagePaths.length} objects`)

// Build storage index by normalized key
const storageByKey = new Map() // normalizedKey -> [paths]
for (const p of storagePaths) {
  const base = p.split('/').pop()
  const key = normalizeKey(base)
  if (!key) continue
  if (!storageByKey.has(key)) storageByKey.set(key, [])
  storageByKey.get(key).push(p)
}

// ---------- PASS A: filename-key bind ----------
function extractFilenameFromImageUrl(u) {
  if (!u) return null
  // pattern: .../original/<filename>?...
  const m = String(u).match(/\/original\/([^?]+)(?:\?|$)/)
  if (m) return decodeURIComponent(m[1])
  // fallback: last path segment before query
  try {
    const url = new URL(u)
    return decodeURIComponent(url.pathname.split('/').pop() || '')
  } catch { return null }
}

const PASS_A = new Map() // rms_id -> { confidence, paths[], primary }
let aExact = 0, aContains = 0, aToken = 0

const SUPABASE_URL = process.env.SUPABASE_URL
function publicUrlFor(p) {
  const enc = p.split('/').map(encodeURIComponent).join('/')
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${enc}`
}

function trailingNum(p) {
  const base = stripExt(p.split('/').pop())
  const m = base.match(/\s+(\d{1,3})$/)
  return m ? parseInt(m[1], 10) : null
}
function orderPaths(paths) {
  // sort: no-trailing-num first, then by ascending trailing num
  return [...paths].sort((a, b) => {
    const na = trailingNum(a), nb = trailingNum(b)
    if (na === null && nb !== null) return -1
    if (nb === null && na !== null) return 1
    return (na ?? 0) - (nb ?? 0)
  })
}

for (const row of dbRows) {
  const x = xlsxByRms.get(row.rms_id)
  const fname = x ? extractFilenameFromImageUrl(x.image_url) : null
  const csvKey = normalizeKey(fname || '')
  let bound = null

  // 1. exact key match
  if (csvKey && storageByKey.has(csvKey)) {
    const paths = orderPaths(storageByKey.get(csvKey))
    bound = { confidence: 'exact', paths, source_filename: fname }
    aExact++
  }
  // 2. contains: csvKey is a prefix/substring of a storage key (or vice versa)
  if (!bound && csvKey) {
    const hits = []
    for (const [k, paths] of storageByKey) {
      if (k === csvKey) continue
      if (k.startsWith(csvKey + ' ') || csvKey.startsWith(k + ' ') || k.includes(csvKey)) {
        hits.push(...paths)
      }
    }
    if (hits.length > 0) {
      bound = { confidence: 'contains', paths: orderPaths([...new Set(hits)]), source_filename: fname }
      aContains++
    }
  }
  // 3. token fallback using product NAME
  if (!bound) {
    const dt = distinctiveTokens(row.title || x?.name || '')
    if (dt.length >= 2) {
      const hits = []
      for (const [k, paths] of storageByKey) {
        const ktoks = new Set(k.split(' '))
        const matched = dt.filter(t => ktoks.has(t)).length
        if (matched >= Math.min(2, dt.length)) hits.push(...paths)
      }
      if (hits.length > 0) {
        bound = { confidence: 'token_fallback', paths: orderPaths([...new Set(hits)]), source_filename: fname }
        aToken++
      }
    }
  }

  if (bound) {
    bound.primary = bound.paths[0]
    bound.public_urls = bound.paths.map(publicUrlFor)
    PASS_A.set(row.rms_id, bound)
  }
}
console.log(`[pass A] bound=${PASS_A.size}  exact=${aExact} contains=${aContains} token=${aToken}`)

// ---------- PASS B: Squarespace fuzzy-join ----------
const siteProducts = JSON.parse(fs.readFileSync('scripts-tmp/owner-site-products.json', 'utf8'))
console.log(`[site] ${siteProducts.length} products`)

// Build index of RMS rows by normalized title key + token sets
const rmsIndex = []
for (const row of dbRows) {
  const key = normalizeKey(row.title)
  rmsIndex.push({ rms_id: row.rms_id, title: row.title, key, tokens: new Set(key.split(' ')) })
}

const PASS_B = new Map() // rms_id -> { confidence, image_urls[], site_title, variant_family_size }

function bindSiteToRms(siteTitle) {
  const sKey = normalizeKey(siteTitle)
  if (!sKey) return []
  const sToks = new Set(sKey.split(' '))
  // exact key
  const exact = rmsIndex.filter(r => r.key === sKey)
  if (exact.length) return { confidence: 'exact', matches: exact }
  // contains either way
  const contains = rmsIndex.filter(r => r.key && (r.key.includes(sKey) || sKey.includes(r.key)))
  if (contains.length) return { confidence: 'contains', matches: contains }
  // token overlap >= 2 distinctive
  const sDistinct = [...sToks].filter(t => t.length >= 4 && !STOPWORDS.has(t))
  if (sDistinct.length >= 2) {
    const hits = rmsIndex.filter(r => sDistinct.filter(t => r.tokens.has(t)).length >= 2)
    if (hits.length) return { confidence: 'token', matches: hits }
  }
  return { confidence: 'none', matches: [] }
}

let bExact = 0, bContains = 0, bToken = 0, variantFamilies = 0
const unmatchedSite = []
for (const sp of siteProducts) {
  const r = bindSiteToRms(sp.title || sp.slug)
  if (!r.matches.length || r.confidence === 'none') {
    unmatchedSite.push({ site_title: sp.title, slug: sp.slug })
    continue
  }
  if (r.confidence === 'exact') bExact++
  else if (r.confidence === 'contains') bContains++
  else bToken++
  if (r.matches.length > 1) variantFamilies++

  // bake hi-res CDN URLs
  const imageUrls = sp.cdn_image_urls.map(u => `${u}?format=2500w`)
  for (const m of r.matches) {
    // Conservative: only auto-bind to public rows (don't spam draft/subrentals)
    const existing = PASS_B.get(m.rms_id)
    // If multiple site products bind to same rms, prefer the one whose title is closer (shorter normalized distance)
    if (!existing || Math.abs(m.key.length - sp.title.length) < Math.abs(m.key.length - (existing.site_title || '').length)) {
      PASS_B.set(m.rms_id, {
        confidence: r.confidence,
        image_urls: imageUrls,
        site_title: sp.title,
        site_url: sp.detail_url,
        variant_family_size: r.matches.length,
      })
    }
  }
}
console.log(`[pass B] bound rms=${PASS_B.size}  exact=${bExact} contains=${bContains} token=${bToken} variant_families=${variantFamilies} unmatched_site=${unmatchedSite.length}`)

// ---------- Reconciliation ----------
// Per precedence:
//  - filename-key (high confidence = exact|contains) wins primary; if it only resolved 1 image, use Squarespace urls as gallery
//  - if only one pass resolved -> use it
//  - if both resolved different primary AND both high confidence -> conflict (don't auto-apply)
const final = new Map() // rms_id -> { source, primary, gallery[], confidence, conflict? }
const conflicts = []

const allRms = new Set([...PASS_A.keys(), ...PASS_B.keys()])
for (const rms_id of allRms) {
  const a = PASS_A.get(rms_id)
  const b = PASS_B.get(rms_id)
  if (a && b) {
    const aHigh = a.confidence === 'exact' || a.confidence === 'contains'
    const aImages = a.public_urls
    const bImages = b.image_urls
    if (aHigh) {
      // filename wins primary; if a only has 1 image and b has more, use b for gallery
      const gallery = aImages.length > 1 ? aImages.slice(1) : bImages
      final.set(rms_id, {
        source: aImages.length > 1 ? 'filename' : 'filename+squarespace',
        confidence: a.confidence,
        primary: aImages[0],
        gallery,
        all_images: [aImages[0], ...gallery],
        site_title: b.site_title,
        notes: aImages.length === 1 ? 'filename single + squarespace gallery' : 'filename only',
      })
    } else {
      // a is token_fallback, lower confidence — prefer Squarespace if it's exact/contains
      if (b.confidence === 'exact' || b.confidence === 'contains') {
        final.set(rms_id, {
          source: 'squarespace', confidence: b.confidence,
          primary: bImages[0], gallery: bImages.slice(1), all_images: bImages,
          site_title: b.site_title, notes: 'squarespace over token_fallback filename',
        })
      } else {
        // both weak -> flag
        conflicts.push({ rms_id, reason: 'both passes low confidence', a_paths: a.paths, b_urls: bImages, site_title: b.site_title })
      }
    }
  } else if (a) {
    final.set(rms_id, {
      source: 'filename', confidence: a.confidence,
      primary: a.public_urls[0], gallery: a.public_urls.slice(1), all_images: a.public_urls,
      notes: 'filename-key only',
    })
  } else if (b) {
    final.set(rms_id, {
      source: 'squarespace', confidence: b.confidence,
      primary: b.image_urls[0], gallery: b.image_urls.slice(1), all_images: b.image_urls,
      site_title: b.site_title,
      notes: b.variant_family_size > 1 ? `variant family of ${b.variant_family_size}` : 'squarespace only',
    })
  }
}

// ---------- Coverage stats ----------
const publicCovered = publicRows.filter(r => final.has(r.rms_id)).length
const totalCovered = final.size
const unmatchedRms = publicRows.filter(r => !final.has(r.rms_id))

const byCategory = {}
for (const r of unmatchedRms) {
  byCategory[r.category] = (byCategory[r.category] || 0) + 1
}

// Filename-key coverage of existing storage files
const boundStoragePaths = new Set()
for (const a of PASS_A.values()) for (const p of a.paths) boundStoragePaths.add(p)
const filenamePassCoveredFiles = boundStoragePaths.size

// ---------- Emit manifest + summary ----------
const manifest = {
  generated_at: new Date().toISOString(),
  counts: {
    db_rows: dbRows.length,
    db_public_rows: publicRows.length,
    storage_objects: storagePaths.length,
    site_products: siteProducts.length,
    pass_a: { bound_rms: PASS_A.size, exact: aExact, contains: aContains, token_fallback: aToken,
              storage_files_bound: filenamePassCoveredFiles },
    pass_b: { bound_rms: PASS_B.size, exact: bExact, contains: bContains, token: bToken,
              variant_families: variantFamilies, unmatched_site: unmatchedSite.length },
    final: {
      total_rms_with_image: totalCovered,
      public_rms_with_image: publicCovered,
      public_rms_without_image: publicRows.length - publicCovered,
      conflicts: conflicts.length,
    },
    unmatched_rms_by_category: byCategory,
  },
  bindings: Object.fromEntries([...final.entries()]),
  conflicts,
  unmatched_site_sample: unmatchedSite.slice(0, 20),
}
fs.writeFileSync(OUT_JSON, JSON.stringify(manifest, null, 2))

// Pick example rows
function sample(arr, n) { return arr.slice(0, n) }
const autoApplyExamples = sample([...final.entries()].filter(([, v]) => v.source !== 'squarespace' || v.confidence !== 'token'), 5)
const unmatchedExamples = sample(unmatchedRms, 5)
const conflictExamples = sample(conflicts, 5)

const lines = []
lines.push('IMAGE BINDING MANIFEST — DRY RUN')
lines.push(`Generated: ${manifest.generated_at}`)
lines.push('')
lines.push('=== THE SIX NUMBERS ===')
lines.push(`1. Filename-key pass (storage files): ${filenamePassCoveredFiles} of ${storagePaths.length} bound`)
lines.push(`   Confidence — exact: ${aExact} · contains: ${aContains} · token_fallback: ${aToken}`)
lines.push(`   RMS rows bound by Pass A: ${PASS_A.size}`)
lines.push('')
lines.push(`2. Squarespace pass (site products): ${PASS_B.size} RMS rows bound from ${siteProducts.length} site products`)
lines.push(`   Confidence — exact: ${bExact} · contains: ${bContains} · token: ${bToken}`)
lines.push(`   Variant-family bindings (1 site product → multiple RMS rows): ${variantFamilies}`)
lines.push(`   Unmatched site products: ${unmatchedSite.length}`)
lines.push('')
lines.push(`3. COMBINED COVERAGE: ${publicCovered} of ${publicRows.length} public RMS rows have ≥1 image`)
lines.push(`   Without image: ${publicRows.length - publicCovered}`)
lines.push('')
lines.push(`4. Conflicts (both passes low-confidence or disagreed): ${conflicts.length}`)
lines.push('')
lines.push('5. Unmatched RMS rows by category:')
for (const [cat, n] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
  lines.push(`   ${cat}: ${n}`)
}
lines.push('')
lines.push('6. SPOT-CHECK EXAMPLES')
lines.push('--- auto_apply (5) ---')
for (const [rms_id, v] of autoApplyExamples) {
  const x = xlsxByRms.get(rms_id)
  lines.push(`  ${rms_id}  "${x?.name}"  source=${v.source}  conf=${v.confidence}  imgs=${v.all_images.length}`)
  lines.push(`     primary: ${v.primary}`)
}
lines.push('--- unmatched_rms (5) ---')
for (const r of unmatchedExamples) {
  const x = xlsxByRms.get(r.rms_id)
  lines.push(`  ${r.rms_id}  "${r.title}"  cat=${r.category}  group=${x?.group}`)
  lines.push(`     image_url filename: ${extractFilenameFromImageUrl(x?.image_url) || '(none)'}`)
}
lines.push('--- conflicts (5) ---')
if (conflictExamples.length === 0) lines.push('  (none)')
for (const c of conflictExamples) {
  const x = xlsxByRms.get(c.rms_id)
  lines.push(`  ${c.rms_id}  "${x?.name}"  reason=${c.reason}`)
}
lines.push('')
lines.push(`Manifest JSON: ${OUT_JSON}`)
fs.writeFileSync(OUT_TXT, lines.join('\n'))
console.log('\n' + lines.join('\n'))
