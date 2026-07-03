// Related-pieces module for the product detail page.
//
// Uses only existing baked-catalog fields — no pgvector, no server call.
// Scoring signals, in order of weight:
//   1. Same categorySlug (strong taxonomic anchor)
//   2. Shared liveSubcategory label (owner's own grouping)
//   3. Color proximity in CIELAB/LCH (ΔL + circular ΔH + ΔC)
//   4. Same colorFamily bucket (small tiebreaker)
//
// Renders 6 tiles. Silent when fewer than 3 qualifying candidates exist.

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  getCollectionCatalog,
  type CollectionProduct,
} from "@/lib/phase3-catalog";

const MAX_TILES = 6;
const MIN_TILES = 3;

function circularHueDelta(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function colorDistance(a: CollectionProduct, b: CollectionProduct): number | null {
  const la = a.colorLightness, lb = b.colorLightness;
  const ca = a.colorChroma, cb = b.colorChroma;
  if (la == null || lb == null || ca == null || cb == null) return null;

  const aNeutral = ca < 8;
  const bNeutral = cb < 8;
  const dL = Math.abs(la - lb); // 0..100
  const dC = Math.abs(ca - cb); // 0..~130

  if (aNeutral && bNeutral) {
    // Both neutral: only lightness matters.
    return dL;
  }
  if (aNeutral !== bNeutral) {
    // Cross-category: penalize but allow.
    return dL + dC * 0.7 + 30;
  }
  const ha = a.colorHue, hb = b.colorHue;
  if (ha == null || hb == null) return dL + dC;
  const dH = circularHueDelta(ha, hb); // 0..180
  return dL * 0.6 + dC * 0.4 + dH * 0.8;
}

function scoreCandidate(
  current: CollectionProduct,
  cand: CollectionProduct,
): number {
  let score = 0;

  if (cand.categorySlug === current.categorySlug) score += 50;

  const aSubs = new Set(current.liveSubcategories ?? []);
  const shared = (cand.liveSubcategories ?? []).some((s) => aSubs.has(s));
  if (shared) score += 30;

  if (
    current.colorFamily &&
    cand.colorFamily &&
    current.colorFamily === cand.colorFamily
  ) {
    score += 15;
  }

  const dist = colorDistance(current, cand);
  if (dist != null) {
    // Distance 0 → +40, 100 → 0, clipped.
    score += Math.max(0, 40 - dist * 0.4);
  }

  return score;
}

function pickRelated(
  current: CollectionProduct,
  all: CollectionProduct[],
): CollectionProduct[] {
  const scored = all
    .filter(
      (p) =>
        p.id !== current.id &&
        p.publicReady !== false &&
        p.primaryImage?.url,
    )
    .map((p) => ({ p, s: scoreCandidate(current, p) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);

  // De-dupe by title to avoid near-identical rows.
  const seenTitles = new Set<string>();
  const out: CollectionProduct[] = [];
  for (const { p } of scored) {
    const key = p.title.trim().toLowerCase();
    if (seenTitles.has(key)) continue;
    seenTitles.add(key);
    out.push(p);
    if (out.length >= MAX_TILES) break;
  }
  return out;
}

export function RelatedPieces({ product }: { product: CollectionProduct }) {
  const [related, setRelated] = useState<CollectionProduct[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCollectionCatalog()
      .then((cat) => {
        if (cancelled) return;
        setRelated(pickRelated(product, cat.products));
      })
      .catch(() => {
        if (!cancelled) setRelated([]);
      });
    return () => {
      cancelled = true;
    };
  }, [product]);

  if (!related || related.length < MIN_TILES) return null;

  return (
    <section
      aria-label="Related pieces"
      className="mt-24 pt-16 border-t border-foreground/10"
    >
      <div className="flex items-baseline justify-between mb-8">
        <h2 className="font-display text-2xl lg:text-3xl tracking-wide uppercase">
          Related Pieces
        </h2>
        <Link
          to="/collection"
          search={{ group: product.categorySlug }}
          className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground hover:text-foreground transition-colors"
        >
          See all {product.displayCategory}
        </Link>
      </div>

      <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6">
        {related.map((p) => {
          const img = p.primaryImage?.url;
          return (
            <li key={p.id}>
              <Link
                to="/collection/$slug"
                params={{ slug: p.slug }}
                className="group block"
              >
                <div className="aspect-[4/5] bg-muted/30 overflow-hidden mb-3">
                  {img ? (
                    <img
                      src={img}
                      alt={p.primaryImage?.altText || p.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : null}
                </div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">
                  {p.displayCategory}
                </p>
                <p className="text-xs tracking-wide uppercase leading-snug">
                  {p.title}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
