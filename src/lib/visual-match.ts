// Rank catalog products by color similarity to a query palette.
// Pure function — no DOM, no network. Uses simple RGB euclidean distance
// (catalog colors are already AI-tagged via the color pipeline, so high
// fidelity matching isn't the bottleneck).

import type { CollectionProduct } from "@/lib/phase3-catalog";

interface RGB { r: number; g: number; b: number }

function hexToRgb(hex: string): RGB | null {
  if (!hex || hex[0] !== "#" || hex.length !== 7) return null;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return { r, g, b };
}

function dist(a: RGB, b: RGB): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export interface ScoredProduct {
  product: CollectionProduct;
  score: number; // lower = closer
}

/**
 * Rank products by minimum color distance to any query hex.
 * @param products full catalog
 * @param queryHexes top palette hexes from the user's uploaded image
 * @param limit max results to return (default 24)
 */
export function rankByColorMatch(
  products: CollectionProduct[],
  queryHexes: string[],
  limit = 24,
): ScoredProduct[] {
  const queries = queryHexes.map(hexToRgb).filter((c): c is RGB => c !== null);
  if (!queries.length) return [];

  const scored: ScoredProduct[] = [];
  for (const p of products) {
    const candidates: RGB[] = [];
    const c1 = p.colorHex ? hexToRgb(p.colorHex) : null;
    const c2 = p.colorHexSecondary ? hexToRgb(p.colorHexSecondary) : null;
    if (c1) candidates.push(c1);
    if (c2) candidates.push(c2);
    if (!candidates.length) continue;

    let best = Infinity;
    for (const cand of candidates) {
      for (const q of queries) {
        const d = dist(cand, q);
        if (d < best) best = d;
      }
    }
    scored.push({ product: p, score: best });
  }

  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, limit);
}
