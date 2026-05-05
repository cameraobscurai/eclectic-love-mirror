import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BROWSE_GROUP_LABELS,
  type BrowseGroupId,
} from "@/lib/collection-browse-groups";
import { CATEGORY_COVERS } from "@/lib/category-covers";
import { withCdnWidth, buildCdnSrcSet } from "@/lib/image-url";
import { useNearViewport } from "@/hooks/useNearViewport";
import type { CollectionProduct } from "@/lib/phase3-catalog";

interface CategoryTonalGridProps {
  groups: Array<{ id: BrowseGroupId; products: CollectionProduct[] }>;
  onSelectCategory: (id: BrowseGroupId) => void;
}

/**
 * Editorial order — flat list, single grid. Uniform tiles, warm checkerboard
 * rhythm. Composition that reads as "inventory archive", not "feature wall".
 *
 * 18 categories → 6 cols × 3 rows on lg, 3 cols on md, 2 cols on mobile.
 * Each tile owns its own aspect-ratio (5/4 — silhouette-friendly), so column
 * height is decoupled from the sibling H-plate. No flex-1 stretching, no
 * span-2 finale tiles, no per-row grids fighting each other.
 *
 * Layout principles applied (audit 2026-05-05):
 *  - aspect-ratio per tile  → predictable cell shape regardless of column width
 *  - items-start at parent  → H-plate and grid each own their height
 *  - warm tonal pair        → reads as editorial paper, not chess board
 *  - no absolute labels     → label is its own grid row beneath the image,
 *                              so all labels share a baseline naturally
 */
const ORDER: BrowseGroupId[] = [
  "sofas", "chairs", "benches-ottomans", "coffee-tables", "side-tables", "cocktail-tables",
  "dining", "bar", "storage", "lighting", "rugs", "pillows",
  "throws", "tableware", "serveware", "styling", "accents", "large-decor",
];

// Warm-neutral pair — both within 6% of paper white #fafaf7, warm cast.
// Reads as a single quiet surface with barely-there rhythm. Replaces the
// cool grey checkerboard that was reading dirty against paper.
const TONES = ["#f5f3ee", "#ece8df"] as const;

const FIRST_ROW_REVEAL_TIMEOUT_MS = 1500;
const FIRST_ROW_COHORT_LG = 6; // top row on desktop

export function CategoryTonalGrid({
  groups,
  onSelectCategory,
}: CategoryTonalGridProps) {
  const byId = useMemo(() => {
    const map = new Map<BrowseGroupId, CollectionProduct[]>();
    for (const g of groups) map.set(g.id, g.products);
    return map;
  }, [groups]);

  const tiles = useMemo(
    () =>
      ORDER.filter((id) => (byId.get(id)?.length ?? 0) > 0).map((id) => {
        const products = byId.get(id)!;
        const cover = CATEGORY_COVERS[id];
        const fallbackHero = products.find((p) => p.primaryImage)?.primaryImage;
        const rawHero = cover ?? fallbackHero?.url ?? null;
        const heroSrc = rawHero ? withCdnWidth(rawHero, 600) : null;
        const heroSrcSet = rawHero
          ? buildCdnSrcSet(rawHero, [320, 480, 720, 960]) || undefined
          : undefined;
        const heroAlt = cover
          ? BROWSE_GROUP_LABELS[id]
          : fallbackHero?.altText ?? BROWSE_GROUP_LABELS[id];
        return {
          id,
          heroSrc,
          heroSrcSet,
          heroAlt,
          label: BROWSE_GROUP_LABELS[id],
        };
      }),
    [byId],
  );

  // First-paint cohort coordination — release reveal once the visible-on-load
  // tiles have decoded. Cohort size is the desktop top-row count; smaller
  // viewports may show fewer but the timeout safety net catches them.
  const cohortSize = Math.min(FIRST_ROW_COHORT_LG, tiles.length);
  const [doneCount, setDoneCount] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = window.setTimeout(() => setTimedOut(true), FIRST_ROW_REVEAL_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, []);

  const cohortReady = doneCount >= cohortSize || timedOut;
  const reportDone = useCallback(() => setDoneCount((n) => n + 1), []);

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 w-full"
      role="list"
      aria-label="Browse by category"
    >
      {tiles.map((t, i) => {
        // Checkerboard rhythm across the actual rendered column count.
        // Computed at render time so 2-col mobile, 3-col tablet, and 6-col
        // desktop each get a clean alternating pattern via CSS-only grid math.
        // (We pick a single seed parity per tile; the visible alternation
        // emerges from the column count via grid-auto-flow.)
        const tone = TONES[i % TONES.length];
        const inCohort = i < cohortSize;
        return (
          <TonalCell
            key={t.id}
            id={t.id}
            heroSrc={t.heroSrc}
            heroSrcSet={t.heroSrcSet}
            heroAlt={t.heroAlt}
            label={t.label}
            tone={tone}
            inCohort={inCohort}
            cohortReady={cohortReady}
            onCohortDone={inCohort ? reportDone : undefined}
            onSelectCategory={onSelectCategory}
          />
        );
      })}
    </div>
  );
}

interface TonalCellProps {
  id: BrowseGroupId;
  heroSrc: string | null;
  heroSrcSet: string | undefined;
  heroAlt: string;
  label: string;
  tone: string;
  inCohort: boolean;
  cohortReady: boolean;
  onCohortDone?: () => void;
  onSelectCategory: (id: BrowseGroupId) => void;
}

function TonalCell({
  id,
  heroSrc,
  heroSrcSet,
  heroAlt,
  label,
  tone,
  inCohort,
  cohortReady,
  onCohortDone,
  onSelectCategory,
}: TonalCellProps) {
  const [loaded, setLoaded] = useState(false);
  const [reported, setReported] = useState(false);
  const { ref, near } = useNearViewport<HTMLButtonElement>({
    rootMargin: "400px",
    initial: inCohort,
  });

  const reportDoneOnce = useCallback(() => {
    if (reported || !onCohortDone) return;
    setReported(true);
    onCohortDone();
  }, [reported, onCohortDone]);

  useEffect(() => {
    if (inCohort && !heroSrc) reportDoneOnce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showImg = inCohort ? cohortReady : near && (loaded || !heroSrc);

  return (
    <button
      ref={ref}
      type="button"
      role="listitem"
      onClick={() => onSelectCategory(id)}
      aria-label={label}
      className="group relative min-w-0 overflow-hidden text-left transition-colors duration-300 ease-out focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/35 focus-visible:ring-inset border-r border-b border-charcoal/[0.06]"
      style={{ background: tone, touchAction: "manipulation" }}
    >
      {/* Image frame — aspect-ratio decouples height from siblings. */}
      <div className="relative w-full" style={{ aspectRatio: "5 / 4" }}>
        {heroSrc ? (
          <img
            src={heroSrc}
            srcSet={heroSrcSet}
            sizes="(min-width: 1024px) 16vw, (min-width: 640px) 32vw, 48vw"
            alt={heroAlt}
            width={600}
            height={480}
            loading={inCohort ? "eager" : "lazy"}
            decoding="async"
            {...({ fetchPriority: inCohort ? "high" : "auto" } as Record<string, string>)}
            onLoad={() => {
              setLoaded(true);
              if (inCohort) reportDoneOnce();
            }}
            onError={() => {
              if (inCohort) reportDoneOnce();
            }}
            className="absolute inset-0 h-full w-full object-contain p-5 sm:p-6 lg:p-7 transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            style={{
              opacity: showImg ? 1 : 0,
              transition: "opacity 380ms ease-out, transform 500ms ease-out",
            }}
          />
        ) : null}
      </div>

      {/* Label — own row beneath the image. No absolute positioning, so
          all labels share a natural baseline across the row. */}
      <span
        className="block px-4 sm:px-5 pb-3 sm:pb-4 pt-2 uppercase text-[10px] sm:text-[11px]"
        style={{
          fontFamily: "var(--font-sans)",
          letterSpacing: "0.22em",
          color: "#1a1a1a",
          lineHeight: 1.2,
        }}
      >
        {label}
      </span>
    </button>
  );
}
