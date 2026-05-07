import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
 * Editorial flat grid — 6×3 desktop, 3 cols tablet, 2 cols mobile.
 * Tiles share the parent's full height (no aspect-ratio per tile) so the
 * grid block matches the sibling H-plate height — no dead space below.
 *
 * Checkerboard tone is computed from row+col parity against the rendered
 * column count, so 2/3/6 col layouts each get a real chess pattern (not
 * a stripe). Column count is published to CSS via --cols and the parity
 * math runs in CSS-land via :nth-child + container width — but since
 * Tailwind doesn't get us there cleanly, we compute it in JS using a
 * single COLS constant per breakpoint and write the tone inline.
 *
 * Why JS for the tone instead of pure CSS: nth-child can't see the column
 * count after grid wrap. We'd need :nth-child(odd of .row-2) which isn't
 * supported. Computing per-tile tone client-side keeps the math explicit.
 */
const ORDER: BrowseGroupId[] = [
  "sofas", "chairs", "benches-ottomans", "coffee-tables", "side-tables",
  "cocktail-tables", "dining", "bar", "lighting", "rugs",
  "pillows", "throws", "tableware", "styling", "large-decor",
];

// Greyscale checker pair — flat white + soft grey for a neutral rhythm.
const TONES = ["#ffffff", "#f1f1f1"] as const;

const FIRST_ROW_REVEAL_TIMEOUT_MS = 1500;

/**
 * Auto-fit solver — given a container box and a tile count, find the
 * (cols, rows) pair that:
 *   1. Holds all N tiles (cols * rows >= N)
 *   2. Produces a cell aspect closest to the target (wider on landscape,
 *      squarer on portrait)
 *   3. Respects min/max columns for each viewport class
 *
 * This replaces hard-coded breakpoint column counts. The grid always
 * fills its parent box completely — no white space below, no clipped
 * rows — at any width from 320px to ultrawide.
 */
function solveGrid(
  width: number,
  height: number,
  count: number,
  opts: { minCols: number; maxCols: number; targetAspect: number },
): { cols: number; rows: number } {
  if (count <= 0 || width <= 0 || height <= 0) {
    return { cols: opts.minCols, rows: 1 };
  }
  let best = { cols: opts.minCols, rows: Math.ceil(count / opts.minCols), score: Infinity };
  for (let cols = opts.minCols; cols <= Math.min(opts.maxCols, count); cols++) {
    const rows = Math.ceil(count / cols);
    const cellW = width / cols;
    const cellH = height / rows;
    const aspect = cellW / cellH;
    // Score = how far cell aspect is from target (log-space so 2x and 0.5x
    // are treated symmetrically), plus a small penalty for empty cells in
    // the last row (we want full rows when possible).
    const aspectScore = Math.abs(Math.log(aspect / opts.targetAspect));
    const emptyCells = cols * rows - count;
    const fillPenalty = emptyCells * 0.05;
    const score = aspectScore + fillPenalty;
    if (score < best.score) best = { cols, rows, score };
  }
  return { cols: best.cols, rows: best.rows };
}

// Viewport-class column bounds. The solver picks within these.
function colBoundsFor(width: number): { minCols: number; maxCols: number; targetAspect: number } {
  if (width >= 1280) return { minCols: 4, maxCols: 6, targetAspect: 1.3 };  // desktop — slightly landscape cells
  if (width >= 1024) return { minCols: 4, maxCols: 5, targetAspect: 1.2 };  // small desktop
  if (width >= 768)  return { minCols: 3, maxCols: 4, targetAspect: 1.0 };  // tablet — squarish
  if (width >= 480)  return { minCols: 2, maxCols: 3, targetAspect: 0.95 }; // large phone
  return { minCols: 2, maxCols: 2, targetAspect: 0.9 };                     // phone — slightly portrait
}

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

  // ResizeObserver-driven solver: measure the container, pick (cols, rows)
  // that fit all tiles with cells closest to a target aspect for the
  // current viewport class. Re-runs on every resize/orientation change.
  const containerRef = useRef<HTMLDivElement>(null);
  const [grid, setGrid] = useState<{ cols: number; rows: number }>({ cols: 5, rows: 3 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const apply = () => {
      const rect = el.getBoundingClientRect();
      const bounds = colBoundsFor(window.innerWidth);
      const next = solveGrid(rect.width, rect.height, tiles.length, bounds);
      setGrid((prev) =>
        prev.cols === next.cols && prev.rows === next.rows ? prev : next,
      );
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener("orientationchange", apply);
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", apply);
    };
  }, [tiles.length]);

  // First-paint cohort = top row at the current solved column count.
  const cohortSize = Math.min(grid.cols, tiles.length);
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
      ref={containerRef}
      data-tonal-grid
      role="list"
      aria-label="Browse by category"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${grid.cols}, 1fr)`,
        gridTemplateRows: `repeat(${grid.rows}, 1fr)`,
        width: "100%",
        height: "100%",
        gap: 0,
        background: "var(--paper)",
      }}
    >
      {tiles.map((t, i) => {
        // Real checkerboard against the solved column count.
        const row = Math.floor(i / grid.cols);
        const col = i % grid.cols;
        const tone = TONES[(row + col) % 2];
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
    // Fills its grid cell. Image absolute-fits; label absolute bottom-left
    // so the silhouette gets the full cell area for presence.
    <button
      ref={ref}
      type="button"
      role="listitem"
      onClick={() => onSelectCategory(id)}
      aria-label={label}
      className="group relative min-w-0 overflow-hidden text-left transition-colors duration-300 ease-out focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/35 focus-visible:ring-inset"
      style={{ background: tone, touchAction: "manipulation" }}
    >
      {heroSrc && !loaded ? (
        <span
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.10) 50%, rgba(0,0,0,0.04) 100%)",
            backgroundSize: "200% 100%",
            animation: "tile-shimmer 1.4s ease-in-out infinite",
            opacity: showImg ? 1 : 0.6,
            transition: "opacity 300ms ease-out",
          }}
        />
      ) : null}
      {heroSrc ? (
        <img
          src={heroSrc}
          srcSet={heroSrcSet}
          sizes="(min-width: 1024px) 20vw, (min-width: 640px) 32vw, 48vw"
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
          className="absolute inset-0 h-full w-full object-contain px-3 pt-3 pb-7 sm:px-4 sm:pt-4 sm:pb-9 transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          style={{
            opacity: showImg && loaded ? 1 : 0,
            transition: "opacity 420ms ease-out, transform 500ms ease-out",
          }}
        />
      ) : null}

      <span
        className="absolute left-2 right-2 bottom-2 sm:left-4 sm:right-4 sm:bottom-4 uppercase pointer-events-none truncate"
        style={{
          fontFamily: "var(--font-sans)",
          letterSpacing: "0.18em",
          color: "#1a1a1a",
          lineHeight: 1.2,
          fontSize: "clamp(9px, 2.4vw, 11px)",
        }}
      >
        {label}
      </span>
    </button>
  );
}
