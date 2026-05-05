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
const wordTokens = s => norm(s).split(' ').filter(t => /[a-z]/.test(t) && t.length >= 3);

// Stems that signal "this RMS title is a VARIANT of family X" (not a separate
// product that happens to start with the same word). Conservative — only
// rolls up when the suffix is clearly variant-noun material.
const VARIANT_NOUN_STEMS = new Set([
  'glass','glassware','wine','coupe','rocks','flute','goblet','tumbler','highball','stemless','champagne',
  'plate','charger','bowl','platter','tray',
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
]);
const hasVariantNoun = title => {
  for (const t of wordTokens(title)) {
    if (VARIANT_NOUN_STEMS.has(t)) return true;
    if (t.endsWith('s') && VARIANT_NOUN_STEMS.has(t.slice(0, -1))) return true;
  }
  return false;
};

export function rollupFamilies(products, liveSnapshot) {
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
  const liveByFirstTok = new Map();
  for (const lp of liveProducts) {
    const t = lp.tokens[0];
    if (!t) continue;
    if (!liveByFirstTok.has(t)) liveByFirstTok.set(t, []);
    liveByFirstTok.get(t).push(lp);
  }

  function familyKeyForRms(p) {
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
    // 3. tokens-subset
    const rmsTokSet = new Set(rmsToks);
    let bestSubset = null;
    for (const lp of liveProducts) {
      if (!lp.tokens.length || lp.tokens.length > rmsToks.length) continue;
      if (lp.tokens.every(t => rmsTokSet.has(t))) {
        if (!bestSubset || lp.tokens.length > bestSubset.tokens.length) bestSubset = lp;
      }
    }
    if (bestSubset) return { key: 'live:' + bestSubset.slug, source: 'tokens-subset', familyTitle: bestSubset.title, liveSlug: bestSubset.slug };
    // 4. family-first-token + variant-noun guard
    const firstTok = rmsToks[0];
    if (firstTok && hasVariantNoun(p.title)) {
      const candidates = liveByFirstTok.get(firstTok);
      if (candidates) {
        const familyCards = candidates.filter(c => c.tokens.length <= 3);
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

  const groups = new Map();
  for (const p of products) {
    const fam = familyKeyForRms(p);
    if (!groups.has(fam.key)) groups.set(fam.key, { fam, members: [] });
    groups.get(fam.key).members.push(p);
  }

  // SAFETY: never collapse members that don't all share the same categorySlug
  // (avoids cross-category rollup errors). If we ever hit one, split it back out.
  const finalProducts = [];
  for (const [key, g] of groups) {
    const cats = new Set(g.members.map(m => m.categorySlug));
    if (cats.size > 1) {
      // split: emit each member as its own tile
      for (const m of g.members) finalProducts.push({ ...m, variants: [] });
      continue;
    }
    if (g.members.length === 1) {
      finalProducts.push({ ...g.members[0], variants: [] });
      continue;
    }
    // Sort members for stable variant order (by stocked qty desc, then title)
    const sorted = [...g.members].sort((a, b) => {
      const aq = parseInt(a.stockedQuantity, 10) || 0;
      const bq = parseInt(b.stockedQuantity, 10) || 0;
      if (bq !== aq) return bq - aq;
      return String(a.title).localeCompare(String(b.title));
    });
    // Pick the member whose images array is longest as the "spokes" tile;
    // its primaryImage becomes the family hero. Title becomes the family title.
    const withMostImages = [...sorted].sort((a, b) => (b.images?.length || 0) - (a.images?.length || 0))[0];
    const family = {
      ...withMostImages,
      // Override title with the live family title (e.g. "Thistle Glassware")
      title: g.fam.familyTitle,
      // Stable family slug — use live slug when we have one, else a synthetic one
      slug: g.fam.liveSlug || `${withMostImages.slug}-family`,
      // Preserve all members as variants for the detail/QuickView
      variants: sorted.map(m => ({
        id: m.id,
        title: m.title,
        dimensions: m.dimensions,
        stockedQuantity: m.stockedQuantity,
      })),
      // Sum imageCount across the group so callers can show "8 photos"
      imageCount: withMostImages.images?.length || 0,
      // Mark how this family was identified
      _familySource: g.fam.source,
    };
    finalProducts.push(family);
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
