// Phase A — Read-only audit of duplicated image bindings.
// No DB or storage writes.
//
// Outputs:
//   scripts-tmp/audit-keep-shared.json    — legitimate variant families
//   scripts-tmp/audit-break-shared.json   — products to reset (false dupes)
//   scripts-tmp/audit-orphan-files.json   — storage files no product points to
//   scripts-tmp/audit-summary.txt

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})
const OUT = (n) => path.resolve(`scripts-tmp/${n}`)

// ---------- pull live state ----------
const { data: rows, error } = await sb
  .from('inventory_items')
  .select('rms_id,title,category,status,images')
  .eq('status', 'available')
  .not('rms_id', 'is', null)
if (error) throw error

// All storage files (bucket-relative paths). list() recursion.
async function listAll(prefix = '') {
  const out = []
  let offset = 0
  while (true) {
    const { data, error } = await sb.storage.from('inventory').list(prefix, {
      limit: 1000, offset, sortBy: { column: 'name', order: 'asc' },
    })
    if (error) throw error
    if (!data?.length) break
    for (const e of data) {
      const full = prefix ? `${prefix}/${e.name}` : e.name
      if (e.id === null) out.push(...await listAll(full))
      else out.push(full)
    }
    if (data.length < 1000) break
    offset += 1000
  }
  return out
}
const allFiles = (await listAll('')).filter(p => !p.endsWith('.lovkeep'))

// ---------- helpers ----------
function urlToStoragePath(url) {
  if (!url) return null
  const m = String(url).match(/\/inventory\/(.+)$/)
  return m ? m[1] : null
}
function basename(p) { return p ? p.split('/').pop() : '' }

// Decide if a shared-hero group is a legitimate variant family.
// KEEP rules:
//   1. Filename ends in " Set.png" (Heston Set, Arian Set, Carlisle Set, …) — owner shoots one set photo
//   2. Filename basename contains Plinth | Banquette | Column — size variants share a hero
//   3. All sharing titles share a common leading word (brand/series prefix) AND
//      titles differ only by trailing size/material modifier (rough heuristic:
//      first token identical for every member AND group size <= 6).
//   4. Category in {tableware, serveware} AND filename includes one of the brand
//      tokens that appears in every title (covers flatware/glass families even
//      when filename naming differs).
function classifyGroup(filePath, members) {
  const fname = basename(filePath)
  const lower = fname.toLowerCase()
  const cats = new Set(members.map(m => m.category))

  // Rule 1: Set.png
  if (/\bset\.[a-z0-9]+$/i.test(fname)) {
    return { keep: true, reason: 'set hero (filename ends in Set)' }
  }
  // Rule 2: explicit variant-family keywords
  if (/(plinth|banquette|column|cocktail column)/i.test(fname)) {
    return { keep: true, reason: 'size-variant family (plinth/banquette/column)' }
  }
  // Rule 3: shared leading brand token + small group + tableware/serveware/bars only
  const firstTokens = members.map(m =>
    m.title.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim().split(/\s+/)[0]
  )
  const allSameFirst = firstTokens.every(t => t === firstTokens[0])
  if (allSameFirst && members.length <= 6 &&
      [...cats].every(c => ['tableware','serveware','bars','tables','seating'].includes(c)) &&
      // filename must reference the brand too
      lower.includes(firstTokens[0])) {
    return { keep: true, reason: `brand family "${firstTokens[0]}" (${members.length} variants in ${[...cats].join(',')})` }
  }
  return { keep: false, reason: 'titles diverge — likely false bind from color-token fallback' }
}

// ---------- group by primary image ----------
const byHero = new Map()
const imageless = []
for (const r of rows) {
  const hero = r.images?.[0] ?? null
  if (!hero) { imageless.push(r); continue }
  if (!byHero.has(hero)) byHero.set(hero, [])
  byHero.get(hero).push(r)
}

const KEEP = []
const BREAK = []
for (const [hero, members] of byHero) {
  if (members.length < 2) continue
  const filePath = urlToStoragePath(hero)
  const { keep, reason } = classifyGroup(filePath || '', members)
  const entry = {
    hero_url: hero,
    storage_path: filePath,
    member_count: members.length,
    categories: [...new Set(members.map(m => m.category))],
    reason,
    members: members.map(m => ({
      rms_id: m.rms_id, title: m.title, category: m.category,
    })),
  }
  if (keep) KEEP.push(entry); else BREAK.push(entry)
}

// Sort: BREAK by group size desc (worst offenders first)
BREAK.sort((a, b) => b.member_count - a.member_count)
KEEP.sort((a, b) => b.member_count - a.member_count)

// ---------- products that BREAK targets (flat list, ready for Phase B) ----------
const breakProducts = BREAK.flatMap(g => g.members.map(m => ({
  rms_id: m.rms_id, title: m.title, category: m.category,
  current_hero: g.hero_url, group_size: g.member_count,
})))

// ---------- orphan storage files ----------
const usedPaths = new Set()
for (const r of rows) {
  for (const u of (r.images ?? [])) {
    const p = urlToStoragePath(u)
    if (p) usedPaths.add(p)
  }
}
const orphans = allFiles.filter(f => !usedPaths.has(f))
const orphansByFolder = {}
for (const f of orphans) {
  const folder = f.split('/').slice(0, -1).join('/') || '(root)'
  orphansByFolder[folder] = (orphansByFolder[folder] || 0) + 1
}

// ---------- write outputs ----------
fs.writeFileSync(OUT('audit-keep-shared.json'), JSON.stringify(KEEP, null, 2))
fs.writeFileSync(OUT('audit-break-shared.json'), JSON.stringify({
  groups: BREAK,
  flat_products_to_reset: breakProducts,
}, null, 2))
fs.writeFileSync(OUT('audit-orphan-files.json'), JSON.stringify({
  total_orphans: orphans.length,
  by_folder: orphansByFolder,
  files: orphans,
}, null, 2))

// ---------- summary ----------
const breakByCat = {}
for (const p of breakProducts) breakByCat[p.category] = (breakByCat[p.category] || 0) + 1

const lines = []
lines.push('AUDIT — DRY RUN, NO WRITES')
lines.push(`Generated: ${new Date().toISOString()}`)
lines.push('')
lines.push(`Public products:                 ${rows.length}`)
lines.push(`Currently imageless:             ${imageless.length}`)
lines.push(`Distinct hero images in use:     ${byHero.size}`)
lines.push(`Shared-hero groups (>=2 SKUs):   ${KEEP.length + BREAK.length}`)
lines.push(`  KEEP (legit variant families): ${KEEP.length}  → ${KEEP.reduce((s,g)=>s+g.member_count,0)} products`)
lines.push(`  BREAK (false dupes to reset):  ${BREAK.length}  → ${breakProducts.length} products`)
lines.push('')
lines.push('BREAK breakdown by category:')
for (const [cat, n] of Object.entries(breakByCat).sort((a,b)=>b[1]-a[1])) {
  lines.push(`  ${cat.padEnd(18)} ${n}`)
}
lines.push('')
lines.push('Top 15 BREAK groups (worst offenders):')
for (const g of BREAK.slice(0, 15)) {
  lines.push(`  [${g.member_count}] ${g.storage_path}`)
  lines.push(`       ${g.members.slice(0,3).map(m=>m.title).join(' | ')}${g.members.length>3?' …':''}`)
}
lines.push('')
lines.push('Top 15 KEEP groups (preserved):')
for (const g of KEEP.slice(0, 15)) {
  lines.push(`  [${g.member_count}] ${g.storage_path}  — ${g.reason}`)
}
lines.push('')
lines.push(`Orphan storage files (not referenced by any product): ${orphans.length}`)
lines.push('  by folder:')
for (const [folder, n] of Object.entries(orphansByFolder).sort((a,b)=>b[1]-a[1]).slice(0,15)) {
  lines.push(`    ${folder.padEnd(40)} ${n}`)
}
lines.push('')
lines.push('Files written:')
lines.push('  scripts-tmp/audit-keep-shared.json')
lines.push('  scripts-tmp/audit-break-shared.json')
lines.push('  scripts-tmp/audit-orphan-files.json')

const summary = lines.join('\n')
fs.writeFileSync(OUT('audit-summary.txt'), summary)
console.log(summary)
