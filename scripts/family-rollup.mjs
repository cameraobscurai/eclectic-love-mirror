// Family rollup — collapses RMS variant rows into one tile per product family,
// using the live Squarespace site as the source of truth for groupings.
//
// Used by both:
//   - scripts/bake-catalog.mjs  (every fresh catalog bake from Supabase)
//   - one-off tools that want to reproduce the same grouping
//
// Inputs:
//   products: CollectionProduct[]   raw RMS rows (one per variant)
//   liveSnapshot: { [liveCat]: [{title, urlId, fullUrl}] }   from
//     scripts/audit/live-inventory-snapshot.json (refresh with the JSON-feed
//     harvest script when the live site changes).
//
// Output:
//   { products: CollectionProduct[]  rolled-up, with .variants[] attached,
//     stats: { ... } }

const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9"'.]+/g, ' ').replace(/\s+/g, ' ').trim();
// Canonicalize material/variant-noun synonyms so live "Glassware" and RMS
// "Glass" collapse to one token. Only safe pairs — keep this list tight.
const TOKEN_CANON = {
  glassware: 'glass',
  glasses: 'glass',
  flatwares: 'flatware',
  serveware: 'serveware',
  dinnerware: 'dinnerware',
  pillows: 'pillow',
  throws: 'throw',
  candlesticks: 'candlestick',
  candleholders: 'candleholder',
  columns: 'column',
  plinths: 'plinth',
  pedestals: 'pedestal',
  risers: 'riser',
  decanters: 'decanter',
  bowls: 'bowl',
  trays: 'tray',
  sets: 'set',
  goblets: 'goblet',
};
const canonTok = t => TOKEN_CANON[t] || t;
const wordTokens = s => norm(s).split(' ').filter(t => /[a-z]/.test(t) && t.length >= 3).map(canonTok);

// Stems that signal "this RMS title is a VARIANT of family X" (not a separate
// product that happens to start with the same word). Conservative — only
// rolls up when the suffix is clearly variant-noun material.
const VARIANT_NOUN_STEMS = new Set([
  'glass','glassware','wine','coupe','rocks','flute','goblet','tumbler','highball','stemless','champagne',
  'plate','charger','bowl','platter','tray','set','dispenser','decanter','cellar','tub','basket','paddle',
  'flatware','fork','knife','spoon','setting',
  'pillow','lumbar','throw',
  'lantern','sconce','pendant','chandelier','lamp',
  'banquette','ottoman','sofa','chair','bench','stool','sectional',
  'table','coffee','side','console','dining',
  'bar','barback','barfront','backbar','frontbar',
  'vase','urn','planter','jardiniere','candle','candlestick','candleholder','holder','hurricane',
  'shelf','shelving','etagere','sideboard','credenza','cabinet',
  'rug','runner','mat',
  'plinth','column','pedestal','riser',
  'stoneware','riverstone',
  'umbrella','diameter',
]);
const hasVariantNoun = title => {
  for (const t of wordTokens(title)) {
    if (VARIANT_NOUN_STEMS.has(t)) return true;
    if (t.endsWith('s') && VARIANT_NOUN_STEMS.has(t.slice(0, -1))) return true;
  }
  return false;
};

export function rollupFamilies(products, liveSnapshot, forcedGroups = []) {
  // Index live products by various keys
  const liveProducts = [];
  for (const [liveCat, items] of Object.entries(liveSnapshot || {})) {
    for (const it of items) {
      const slug = (it.fullUrl || '').split('/').filter(Boolean).pop() || '';
      liveProducts.push({
        liveCat, slug, title: it.title,
        key: norm(it.title),
        tokens: wordTokens(it.title),
      });
    }
  }
  const liveByKey = new Map(liveProducts.map(l => [l.key, l]));

  // Owner-forced family overrides: rms_id → live tile (preempts heuristics).
  const forcedByRms = new Map();
  for (const g of forcedGroups || []) {
    const lp = liveByKey.get(norm(g.live));
    // If live tile isn't in the snapshot, still honor the owner-forced grouping —
    // synthesize a slug from g.live and use g.live as the displayed family title.
    const familyTitle = lp ? lp.title : g.live;
    const liveSlug = lp ? lp.slug : norm(g.live).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (!lp) console.warn('[rollup] forced group live tile not in snapshot, using owner title:', g.live);
    for (const rmsId of g.rms || []) {
      forcedByRms.set(String(rmsId), { key: 'live:' + liveSlug, source: lp ? 'forced' : 'forced-owner', familyTitle, liveSlug });
    }
  }
  if (forcedByRms.size) console.log(`[rollup] ${forcedByRms.size} rms_ids assigned by forced groups`);
  const liveByFirstTok = new Map();
  for (const lp of liveProducts) {
    const t = lp.tokens[0];
    if (!t) continue;
    if (!liveByFirstTok.has(t)) liveByFirstTok.set(t, []);
    liveByFirstTok.get(t).push(lp);
  }

  function familyKeyForRms(p) {
    // 0. owner-forced override
    const forced = forcedByRms.get(String(p.id));
    if (forced) return forced;
    const k = norm(p.title);
    const rmsToks = wordTokens(p.title);
    // 1. exact title
    if (liveByKey.has(k)) return { key: 'live:' + liveByKey.get(k).slug, source: 'exact', familyTitle: p.title, liveSlug: liveByKey.get(k).slug };
    // 2. live key is a prefix of RMS title
    for (let n = Math.min(rmsToks.length, 5); n >= 2; n--) {
      const prefix = rmsToks.slice(0, n).join(' ');
      if (liveByKey.has(prefix)) {
        const lp = liveByKey.get(prefix);
        return { key: 'live:' + lp.slug, source: `prefix-${n}`, familyTitle: lp.title, liveSlug: lp.slug };
      }
    }
    // 3. tokens-subset (also strip trailing variant-noun on the live side
    //    so live "Anastasia Antique Silver Flatware" matches RMS
    //    "Anastasia Antique Silver Butter Knife")
    const rmsTokSet = new Set(rmsToks);
    const stripTrailingVariant = (toks) => {
      const out = [...toks];
      while (out.length > 1 && VARIANT_NOUN_STEMS.has(out[out.length-1])) out.pop();
      return out;
    };
    let bestSubset = null;
    let bestSubsetCoreLen = 0;
    for (const lp of liveProducts) {
      const core = stripTrailingVariant(lp.tokens);
      if (!core.length || core.length > rmsToks.length) continue;
      if (core.every(t => rmsTokSet.has(t))) {
        if (!bestSubset || core.length > bestSubsetCoreLen) { bestSubset = lp; bestSubsetCoreLen = core.length; }
      }
    }
    if (bestSubset) return { key: 'live:' + bestSubset.slug, source: 'tokens-subset', familyTitle: bestSubset.title, liveSlug: bestSubset.slug };
    // 4. family-first-token + variant-noun guard
    const firstTok = rmsToks[0];
    if (firstTok && hasVariantNoun(p.title)) {
      const candidates = liveByFirstTok.get(firstTok);
      if (candidates) {
        const familyCards = candidates.filter(c => stripTrailingVariant(c.tokens).length <= 3);
        if (familyCards.length === 1) {
          return { key: 'live:' + familyCards[0].slug, source: 'family-first-token', familyTitle: familyCards[0].title, liveSlug: familyCards[0].slug };
        }
        if (familyCards.length > 1) {
          const refined = familyCards.filter(c => !c.tokens[1] || rmsTokSet.has(c.tokens[1]));
          if (refined.length === 1) return { key: 'live:' + refined[0].slug, source: 'family-first-token-refined', familyTitle: refined[0].title, liveSlug: refined[0].slug };
        }
      }
    }
    // 5. RMS-only
    return { key: 'rms:' + p.id, source: 'rms-only', familyTitle: p.title, liveSlug: null };
  }

  // Group by family key + categorySlug, so a live family that spans two RMS
  // categories (e.g. Lavanya Stoneware = Dinnerware plates AND Serveware bowls)
  // becomes one tile per category — matching the OG site, which shows the
  // family in both Dinnerware and Serveware sub-tabs.
  const groups = new Map();
  for (const p of products) {
    const fam = familyKeyForRms(p);
    const key = fam.key + '@' + p.categorySlug;
    if (!groups.has(key)) groups.set(key, { fam, members: [] });
    groups.get(key).members.push(p);
  }

  const finalProducts = [];
  for (const [key, g] of groups) {
    if (g.members.length === 1) {
      finalProducts.push({ ...g.members[0], variants: [] });
      continue;
    }
    // Sort members so variant order mirrors the set hero photo: largest size
    // first (descending). Parses a leading dimension token like `11"`, `9"`,
    // `6.5"`, `12in`, `12 in`, or `30cm` from the title. Falls back to stocked
    // qty desc, then alpha — preserves prior behavior when no size is present
    // (e.g. flatware piece names).
    const sizeOf = (title) => {
      const t = String(title || '');
      const m = t.match(/(\d+(?:\.\d+)?)\s*(?:"|''|”|in\b|inch(?:es)?\b|cm\b|mm\b)/i);
      return m ? parseFloat(m[1]) : null;
    };
    const sorted = [...g.members].sort((a, b) => {
      const sa = sizeOf(a.title), sb = sizeOf(b.title);
      if (sa != null && sb != null && sa !== sb) return sb - sa;
      if (sa != null && sb == null) return -1;
      if (sa == null && sb != null) return 1;
      const aq = parseInt(a.stockedQuantity, 10) || 0;
      const bq = parseInt(b.stockedQuantity, 10) || 0;
      if (bq !== aq) return bq - aq;
      return String(a.title).localeCompare(String(b.title));
    });
    // Merge images from ALL variant members (dedupe by URL, preserve order:
    // hero member's images first, then any additional ones from siblings).
    const withMostImages = [...sorted].sort((a, b) => (b.images?.length || 0) - (a.images?.length || 0))[0];
    const seen = new Set();
    const seenKeys = new Set();
    const mergedImages = [];
    const keyFor = (url) => {
      try {
        const path = new URL(url).pathname;
        const base = decodeURIComponent(path.split('/').pop() || '')
          .replace(/\+/g, ' ').trim().toLowerCase();
        return base || url;
      } catch { return url; }
    };
    const pushImg = (img) => {
      if (!img) return;
      const url = typeof img === 'string' ? img : img.url || img.src || '';
      if (!url) return;
      const k = keyFor(url);
      if (seen.has(url) || seenKeys.has(k)) return;
      seen.add(url); seenKeys.add(k);
      mergedImages.push(img);
    };
    const urlFor = (img) => typeof img === 'string' ? img : img?.url || img?.src || '';
    const isSetImage = (img) => /(?:^|[\s._+-])(set|collection|group|family)(?:[\s._+-]|\.|$)/i.test(keyFor(urlFor(img)));
    const scoreVariantImage = (img, member) => {
      const key = keyFor(urlFor(img));
      const family = new Set(wordTokens(g.fam.familyTitle));
      const tokens = wordTokens(member.title).filter(t => !family.has(t) || VARIANT_NOUN_STEMS.has(t));
      const nums = String(member.title || '').match(/\d+(?:\.\d+)?/g) || [];
      let score = 0;
      for (const n of nums) if (key.includes(n)) score += 3;
      for (const t of tokens) if (key.includes(t)) score += VARIANT_NOUN_STEMS.has(t) ? 2 : 1;
      return score;
    };
    const imageForVariant = (member) => {
      const imgs = member.images || [];
      if (!imgs.length) return null;
      const first = imgs[0];
      if (!isSetImage(first)) return first;
      let best = null;
      for (const img of imgs.slice(1)) {
        if (isSetImage(img)) continue;
        const score = scoreVariantImage(img, member);
        if (score > 0 && (!best || score > best.score)) best = { img, score };
      }
      return best?.img || null;
    };
    for (const img of (withMostImages.images || [])) pushImg(img);
    for (const m of sorted) {
      if (m === withMostImages) continue;
      for (const img of (m.images || [])) pushImg(img);
    }

    // Tableware family covers must be the SET / group shot, not whichever
    // variant row sorted first. New owner-uploaded folders often use opaque
    // generated filenames, so filename tokens are not reliable. Instead, use
    // the invariant we bake for QuickView: each variant owns its row's first
    // image; the SET shot is the first merged image not claimed by any variant.
    if ((withMostImages.categorySlug === 'tableware' || withMostImages.categorySlug === 'serveware') && mergedImages.length > 1) {
      const variantImageKeys = new Set(
        sorted
          .map((m) => imageForVariant(m))
          .map((img) => img ? keyFor(urlFor(img)) : '')
          .filter(Boolean),
      );
      let setIdx = mergedImages.findIndex(isSetImage);
      if (setIdx < 0) setIdx = mergedImages.findIndex((img) => {
        const url = typeof img === 'string' ? img : img.url || img.src || '';
        return url && !variantImageKeys.has(keyFor(url));
      });
      if (setIdx > 0) mergedImages.unshift(...mergedImages.splice(setIdx, 1));
    }

    const family = {
      ...withMostImages,
      title: g.fam.familyTitle,
      slug: g.fam.liveSlug || `${withMostImages.slug}-family`,
      images: mergedImages,
      primaryImage: mergedImages[0] || withMostImages.primaryImage,
      variants: sorted.map(m => {
        const firstImg = (m.images || [])[0];
        const imageUrl = firstImg ? (typeof firstImg === 'string' ? firstImg : firstImg.url) : null;
        return {
          id: m.id,
          title: m.title,
          dimensions: m.dimensions,
          stockedQuantity: m.stockedQuantity,
          imageUrl,
        };
      }),
      // Sum imageCount across the group so callers can show "8 photos"
      imageCount: mergedImages.length,
      // Mark how this family was identified
      _familySource: g.fam.source,
    };
    finalProducts.push(family);
  }

  // De-duplicate slugs (cross-category families share a liveSlug)
  const slugSeen = new Map();
  for (const p of finalProducts) {
    const c = (slugSeen.get(p.slug) || 0) + 1;
    slugSeen.set(p.slug, c);
    if (c > 1) p.slug = `${p.slug}-${p.categorySlug}`;
  }

  // Stats
  const sourceCounts = {};
  for (const p of finalProducts) {
    const src = p._familySource || (p.variants?.length ? 'rolled' : 'standalone');
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  }
  return {
    products: finalProducts,
    stats: {
      inputRows: products.length,
      outputFamilies: finalProducts.length,
      collapsed: products.length - finalProducts.length,
      sourceCounts,
    },
  };
}
