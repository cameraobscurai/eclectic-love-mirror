// Related-pieces module for the product detail page.
//
// Uses only existing baked-catalog fields — no pgvector, no server call.
// Scoring signals, in order of weight:
//   1. Same declaredCategory (strong taxonomic anchor)
//   2. Shared liveSubcategory label (owner's own grouping)
//   3. Color proximity in CIELAB/LCH (ΔL + circular ΔH + ΔC)
//   4. Same colorFamily bucket (small tiebreaker)
//
// The two signals are now rendered as two separate rails instead of one
// anonymous row: "More in <category>" (taxonomy) and "Finishes the look"
// (cross-category color proximity). The second rail is the designer move —
// it is the only surface that exposes the color pipeline as a reason.
//
// Each tile carries a hover "+" that adds the piece to the inquiry tray, so
// a client can assemble a lounge from one page instead of six round-trips.

import { useEffect, useState } from "react";

import {
  getCollectionCatalog,
  type CollectionProduct,
} from "@/lib/phase3-catalog";
import { useInquiry } from "@/hooks/use-inquiry";
import { useQuickView } from "@/hooks/use-quick-view";

const MAX_TILES = 6;
const MIN_TILES = 3;
/** CIELAB-ish distance under which two pieces read as the same palette. */
const PALETTE_MAX_DISTANCE = 60;

function circularHueDelta(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export function colorDistance(
  a: CollectionProduct,
  b: CollectionProduct,
): number | null {
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

function taxonomyScore(
  current: CollectionProduct,
  cand: CollectionProduct,
): number {
  let score = 0;

  // Declared taxonomy drives affinity: same category is the strongest signal,
  // same collection a weaker one. Legacy `categorySlug` is no longer consulted.
  if (
    current.declaredCategory &&
    cand.declaredCategory === current.declaredCategory
  ) {
    score += 50;
  } else if (
    current.collectionSlug &&
    cand.collectionSlug === current.collectionSlug
  ) {
    score += 25;
  }

  const aSubs = new Set(current.liveSubcategories ?? []);
  const shared = (cand.liveSubcategories ?? []).some((s) => aSubs.has(s));
  if (shared) score += 30;

  return score;
}

function colorScore(
  current: CollectionProduct,
  cand: CollectionProduct,
): number {
  let score = 0;
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

function eligible(current: CollectionProduct, all: CollectionProduct[]) {
  return all.filter(
    (p) => p.id !== current.id && p.publicReady !== false && p.primaryImage?.url,
  );
}

function dedupeTake(
  scored: Array<{ p: CollectionProduct; s: number }>,
  exclude: Set<string>,
  limit: number,
): CollectionProduct[] {
  const seenTitles = new Set<string>();
  const out: CollectionProduct[] = [];
  for (const { p } of scored.sort((a, b) => b.s - a.s)) {
    if (exclude.has(p.id)) continue;
    const key = p.title.trim().toLowerCase();
    if (seenTitles.has(key)) continue;
    seenTitles.add(key);
    out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}

export type RelatedSplit = {
  /** Same category / subcategory — the "more like this" rail. */
  taxonomy: CollectionProduct[];
  /** Different category, same palette — the "finishes the look" rail. */
  palette: CollectionProduct[];
};

export function pickRelatedSplit(
  current: CollectionProduct,
  all: CollectionProduct[],
): RelatedSplit {
  const pool = eligible(current, all);

  const taxonomy = dedupeTake(
    pool
      .map((p) => ({ p, s: taxonomyScore(current, p) + colorScore(current, p) * 0.2 }))
      .filter((x) => taxonomyScore(current, x.p) > 0),
    new Set(),
    MAX_TILES,
  );

  const taken = new Set(taxonomy.map((p) => p.id));
  const palette = dedupeTake(
    pool
      .filter((p) => {
        // Cross-category only — same-category matches already have a rail.
        if (
          current.declaredCategory &&
          p.declaredCategory === current.declaredCategory
        ) {
          return false;
        }
        const d = colorDistance(current, p);
        return d != null && d < PALETTE_MAX_DISTANCE;
      })
      .map((p) => ({ p, s: colorScore(current, p) })),
    taken,
    MAX_TILES,
  );

  return { taxonomy, palette };
}

export function RelatedPieces({
  product,
  allProducts,
}: {
  product: CollectionProduct;
  /**
   * Optional pre-resolved catalog products from the parent route loader.
   * When supplied, RelatedPieces renders synchronously with no re-fetch and
   * no null-flash. Legacy call sites without this prop fall back to the
   * async module-cached getCollectionCatalog().
   */
  allProducts?: CollectionProduct[];
}) {
  const [split, setSplit] = useState<RelatedSplit | null>(() =>
    allProducts ? pickRelatedSplit(product, allProducts) : null,
  );

  useEffect(() => {
    if (allProducts) {
      setSplit(pickRelatedSplit(product, allProducts));
      return;
    }
    let cancelled = false;
    getCollectionCatalog()
      .then((cat) => {
        if (cancelled) return;
        setSplit(pickRelatedSplit(product, cat.products));
      })
      .catch(() => {
        if (!cancelled) setSplit({ taxonomy: [], palette: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [product, allProducts]);

  if (!split) return null;
  const showTaxonomy = split.taxonomy.length >= MIN_TILES;
  const showPalette = split.palette.length >= MIN_TILES;
  if (!showTaxonomy && !showPalette) return null;

  const seeAllHref = product.collectionSlug
    ? `/collection?group=${encodeURIComponent(product.collectionSlug)}${product.declaredCategory ? `&subcategory=${encodeURIComponent(product.declaredCategory)}` : ""}`
    : "/collection";

  return (
    <>
      {showTaxonomy && (
        <RelatedRail
          heading={`More in ${product.displayCategory || "the archive"}`}
          note="Same category"
          items={split.taxonomy}
          action={{ href: seeAllHref, label: `See all ${product.displayCategory}` }}
        />
      )}
      {showPalette && (
        <RelatedRail
          heading="Finishes the look"
          note="Same palette, across the archive"
          items={split.palette}
        />
      )}
    </>
  );
}

function RelatedRail({
  heading,
  note,
  items,
  action,
}: {
  heading: string;
  note: string;
  items: CollectionProduct[];
  action?: { href: string; label: string };
}) {
  const inquiry = useInquiry();

  return (
    <section
      aria-label={heading}
      className="mt-20 pt-14 border-t border-foreground/10"
    >
      <div className="flex items-baseline justify-between gap-6 mb-8">
        <div>
          <h2 className="font-display text-2xl lg:text-3xl tracking-wide uppercase">
            {heading}
          </h2>
          <p className="mt-2 text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
            {note}
          </p>
        </div>
        {action && (
          <a
            href={action.href}
            className="shrink-0 text-[10px] tracking-[0.25em] uppercase text-muted-foreground hover:text-foreground transition-colors"
          >
            {action.label}
          </a>
        )}
      </div>

      <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6">
        {items.map((p) => {
          const img = p.primaryImage?.url;
          const added = inquiry.has(p.id);
          return (
            <li key={p.id} className="relative group">
              {/* Quick View, not a hard navigation — a rail tile peeks in
                  place and keeps the visitor on the piece they came for. */}
              <button
                type="button"
                onClick={() => openQuickView(p.slug ?? p.id)}
                aria-label={`Quick view ${p.title}`}
                className="block w-full text-left"
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
              </button>
              <button
                type="button"
                onClick={() => inquiry.toggle(p.id)}
                aria-label={
                  added ? `Remove ${p.title} from inquiry` : `Add ${p.title} to inquiry`
                }
                title={added ? "In your inquiry" : "Add to inquiry"}
                className={`absolute top-2 right-2 h-8 w-8 flex items-center justify-center text-sm leading-none border transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-foreground/40 ${
                  added
                    ? "bg-foreground text-background border-foreground opacity-100"
                    : "bg-background/85 text-foreground border-foreground/20 opacity-0 group-hover:opacity-100 focus:opacity-100"
                }`}
              >
                {added ? "✓" : "+"}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
