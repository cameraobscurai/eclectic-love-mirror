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

// Editorial row composition. Each row is its own grid; flex-1 distributes
// the parent height so the four rows always read as one unified surface.
// 5/5/4/4 = 18 cells (one per browse group). Last two rows are 4-wide so
// those tiles get extra horizontal weight — that "finale" feel.
const ROWS: BrowseGroupId[][] = [
  ["sofas", "chairs", "benches-ottomans", "coffee-tables", "side-tables"],
  ["cocktail-tables", "dining", "bar", "storage", "lighting"],
  ["rugs", "pillows", "throws", "tableware"],
  ["serveware", "styling", "accents", "large-decor"],
];

// 2-tone cool checkerboard — paper-white against a soft cool grey to
// match the white H-plate sitting alongside.
const TONES = ["#f1f2f3", "#dde0e3"] as const;

const FIRST_ROW_REVEAL_TIMEOUT_MS = 1500;

/**
 * Reactive tonal grid — Collection landing's right pane.
 *
 * Structure: flex column of row-grids. Each row is `flex-1` so it claims an
 * equal share of the parent height. Per-row `gridTemplateColumns` keeps the
 * column math local to that row, which means changing row composition is a
 * pure data edit (reorder ROWS or change a row's length) with zero CSS.
 *
 * On lg+ the parent stretches to match the sibling H-plate (items-stretch).
 * Below lg the grid stacks under the hero image and rows take their natural
 * height via `min-h-[16vh]` so each tile stays readable.
 */
export function CategoryTonalGrid({
  groups,
  onSelectCategory,
}: CategoryTonalGridProps) {
  // Index by id so we can preserve ROWS order regardless of input ordering.
  const byId = useMemo(() => {
    const map = new Map<BrowseGroupId, CollectionProduct[]>();
    for (const g of groups) map.set(g.id, g.products);
    return map;
  }, [groups]);

  const resolvedRows = useMemo(
    () =>
      ROWS.map((row) =>
        row
          .filter((id) => (byId.get(id)?.length ?? 0) > 0)
          .map((id) => {
            const products = byId.get(id)!;
            const cover = CATEGORY_COVERS[id];
            const fallbackHero = products.find((p) => p.primaryImage)?.primaryImage;
            const rawHero = cover ?? fallbackHero?.url ?? null;
            const heroSrc = rawHero ? withCdnWidth(rawHero, 750) : null;
            const heroSrcSet = rawHero
              ? buildCdnSrcSet(rawHero, [400, 600, 900]) || undefined
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
      ).filter((row) => row.length > 0),
    [byId],
  );

  // First-paint cohort — first row's tiles. Eager-load + reveal-coordinated
  // so the landing screen lands as a single visual moment instead of a
  // top-to-bottom waterfall.
  const FIRST_ROW_COHORT = resolvedRows[0]?.length ?? 0;
  const [firstRowDoneCount, setFirstRowDoneCount] = useState(0);
  const [firstRowTimedOut, setFirstRowTimedOut] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = window.setTimeout(
      () => setFirstRowTimedOut(true),
      FIRST_ROW_REVEAL_TIMEOUT_MS,
    );
    return () => window.clearTimeout(t);
  }, []);

  const firstRowReady =
    firstRowDoneCount >= FIRST_ROW_COHORT || firstRowTimedOut;

  const reportFirstRowDone = useCallback(() => {
    setFirstRowDoneCount((n) => n + 1);
  }, []);

  // Max row length defines the canonical grid width on ≥sm. Rows shorter
  // than the max get their last tile spanning the remainder so we never
  // leave an empty ghost cell — that "span-2 finale" feel.
  const MAX_COLS = resolvedRows.reduce((n, r) => Math.max(n, r.length), 1);

  return (
    <div className="flex h-full w-full flex-col">
      {resolvedRows.map((row, rowIdx) => (
        <div
          key={rowIdx}
          className="flex-1 min-h-0 grid grid-cols-3 sm:[grid-template-columns:var(--row-cols)]"
          style={{
            ["--row-cols" as string]: `repeat(${MAX_COLS}, minmax(0, 1fr))`,
          }}
        >
          {row.map((item, colIdx) => {
            // True checkerboard via position-based modulo across MAX_COLS.
            const tone = TONES[(rowIdx * MAX_COLS + colIdx) % TONES.length];
            const isFirstRow = rowIdx === 0;
            const isLast = colIdx === row.length - 1;
            const finaleSpan = isLast ? MAX_COLS - row.length + 1 : 1;
            return (
              <TonalCell
                key={item.id}
                id={item.id}
                heroSrc={item.heroSrc}
                heroSrcSet={item.heroSrcSet}
                heroAlt={item.heroAlt}
                label={item.label}
                tone={tone}
                isFirstRow={isFirstRow}
                firstRowReady={firstRowReady}
                onFirstRowImageDone={isFirstRow ? reportFirstRowDone : undefined}
                onSelectCategory={onSelectCategory}
                spanCols={finaleSpan}
              />
            );
          })}
        </div>
      ))}
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
  isFirstRow: boolean;
  firstRowReady: boolean;
  onFirstRowImageDone?: () => void;
  onSelectCategory: (id: BrowseGroupId) => void;
  spanCols?: number;
}

function TonalCell({
  id,
  heroSrc,
  heroSrcSet,
  heroAlt,
  label,
  tone,
  isFirstRow,
  firstRowReady,
  onFirstRowImageDone,
  onSelectCategory,
  spanCols = 1,
}: TonalCellProps) {
  const [loaded, setLoaded] = useState(false);
  const [reported, setReported] = useState(false);
  const { ref, near } = useNearViewport<HTMLButtonElement>({
    rootMargin: "400px",
    initial: isFirstRow,
  });

  const reportDoneOnce = useCallback(() => {
    if (reported || !onFirstRowImageDone) return;
    setReported(true);
    onFirstRowImageDone();
  }, [reported, onFirstRowImageDone]);

  useEffect(() => {
    if (isFirstRow && !heroSrc) reportDoneOnce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showImg = isFirstRow ? firstRowReady : near && (loaded || !heroSrc);

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onSelectCategory(id)}
      aria-label={label}
      className="group relative min-w-0 overflow-hidden text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/35 focus-visible:ring-inset border-r border-b border-charcoal/10 last:border-r-0"
      style={{
        background: tone,
        touchAction: "manipulation",
        gridColumn: spanCols > 1 ? `span ${spanCols}` : undefined,
      }}
    >
      {heroSrc ? (
        <img
          src={heroSrc}
          srcSet={heroSrcSet}
          sizes="(min-width: 1280px) 12vw, (min-width: 1024px) 15vw, (min-width: 640px) 20vw, 32vw"
          alt={heroAlt}
          loading={isFirstRow ? "eager" : "lazy"}
          decoding="async"
          {...({ fetchPriority: isFirstRow ? "high" : "auto" } as Record<string, string>)}
          onLoad={() => {
            setLoaded(true);
            if (isFirstRow) reportDoneOnce();
          }}
          onError={() => {
            if (isFirstRow) reportDoneOnce();
          }}
          className="absolute inset-0 h-full w-full object-contain p-5 sm:p-7 xl:p-8 transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          style={{
            opacity: showImg ? 1 : 0,
            transition: "opacity 380ms ease-out, transform 500ms ease-out",
          }}
        />
      ) : null}

      <span
        className="absolute left-4 bottom-3 sm:left-5 sm:bottom-4 uppercase text-[10px] sm:text-[11px]"
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
