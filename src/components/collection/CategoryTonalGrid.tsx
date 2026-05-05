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

// 3-tone neutral palette sampled to read alongside cream/sand brand tokens.
// Cycled by (row + col) % 3 so no neighbor (above, left, right, below)
// repeats — the grid reads as a seamless tonal checker.
const TONES = ["#efece6", "#d9d4cb", "#c8c2b6"] as const;

// Categories that earn a wider 2-col cell at xl. Picked for composition
// (horizontal forms read better landscape) AND for slot math: 18 cards in
// a 5-col grid = 16 single + 2 double = exactly 20 cells, no holes.
const WIDE_CELLS = new Set<BrowseGroupId>(["benches-ottomans", "large-decor"]);

const FIRST_ROW_REVEAL_TIMEOUT_MS = 1500;

/**
 * Reactive tonal grid — Collection landing's right pane.
 *
 * Height is driven by the sibling H-plate via the parent's `items-stretch`,
 * not by per-cell aspect math. `gridAutoRows: 1fr` makes the four rows
 * divide that height evenly. Resize the window and the grid grows in
 * lockstep with the H — no wasted cream slab at the bottom.
 *
 * Two cells span 2 cols at xl for compositional rhythm (matches owner's
 * reference). Below xl the layout collapses to 4 / 3 / 2 cols and reverts
 * to square cells, since the H-plate stacks above on those breakpoints.
 */
export function CategoryTonalGrid({
  groups,
  onSelectCategory,
}: CategoryTonalGridProps) {
  const resolved = useMemo(
    () =>
      groups.map((group) => {
        const cover = CATEGORY_COVERS[group.id];
        const fallbackHero = group.products.find((p) => p.primaryImage)?.primaryImage;
        const rawHero = cover ?? fallbackHero?.url ?? null;
        const heroSrc = rawHero ? withCdnWidth(rawHero, 750) : null;
        const heroSrcSet = rawHero
          ? buildCdnSrcSet(rawHero, [400, 600, 900]) || undefined
          : undefined;
        const heroAlt = cover
          ? BROWSE_GROUP_LABELS[group.id]
          : fallbackHero?.altText ?? BROWSE_GROUP_LABELS[group.id];
        return {
          id: group.id,
          heroSrc,
          heroSrcSet,
          heroAlt,
          label: BROWSE_GROUP_LABELS[group.id],
          wide: WIDE_CELLS.has(group.id),
        };
      }),
    [groups],
  );

  // First-paint cohort — first 5 cards. Spans + responsive cols make the
  // exact "first row" ambiguous; the safety-net timeout covers misses.
  const FIRST_ROW_COHORT = Math.min(5, resolved.length);
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

  // Walk cards in render order honoring spans → real (row, col) per cell.
  // Used so the tonal checker still alternates correctly across wide cells.
  // Computed for the xl 5-col layout; sub-xl just uses idx-based tones,
  // which is good enough at narrower widths.
  const xlPlacement = useMemo(() => {
    const COLS = 5;
    const out: Array<{ row: number; col: number }> = [];
    let row = 0;
    let col = 0;
    for (const item of resolved) {
      const span = item.wide ? 2 : 1;
      if (col + span > COLS) {
        row += 1;
        col = 0;
      }
      out.push({ row, col });
      col += span;
      if (col >= COLS) {
        row += 1;
        col = 0;
      }
    }
    return out;
  }, [resolved]);

  return (
    <ul
      className="grid w-full h-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      style={{
        gap: 0,
        // 1fr rows = grid stretches to fill parent height. Sub-xl this is
        // harmless since cells set their own square aspect inside.
        gridAutoRows: "1fr",
      }}
    >
      {resolved.map((item, idx) => {
        const place = xlPlacement[idx];
        const tone = TONES[(place.row + place.col) % TONES.length];
        const isFirstRowCohort = idx < FIRST_ROW_COHORT;
        return (
          <TonalCell
            key={item.id}
            id={item.id}
            heroSrc={item.heroSrc}
            heroSrcSet={item.heroSrcSet}
            heroAlt={item.heroAlt}
            label={item.label}
            tone={tone}
            wide={item.wide}
            isFirstRow={isFirstRowCohort}
            firstRowReady={firstRowReady}
            onFirstRowImageDone={isFirstRowCohort ? reportFirstRowDone : undefined}
            onSelectCategory={onSelectCategory}
          />
        );
      })}
    </ul>
  );
}

interface TonalCellProps {
  id: BrowseGroupId;
  heroSrc: string | null;
  heroSrcSet: string | undefined;
  heroAlt: string;
  label: string;
  tone: string;
  wide: boolean;
  isFirstRow: boolean;
  firstRowReady: boolean;
  onFirstRowImageDone?: () => void;
  onSelectCategory: (id: BrowseGroupId) => void;
}

function TonalCell({
  id,
  heroSrc,
  heroSrcSet,
  heroAlt,
  label,
  tone,
  wide,
  isFirstRow,
  firstRowReady,
  onFirstRowImageDone,
  onSelectCategory,
}: TonalCellProps) {
  const [loaded, setLoaded] = useState(false);
  const [reported, setReported] = useState(false);
  const { ref, near } = useNearViewport<HTMLLIElement>({
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
    <li
      ref={ref}
      className={[
        "relative min-w-0",
        // Wide span only at xl — sub-xl cells stay uniform.
        wide ? "xl:col-span-2" : "",
      ].join(" ")}
      style={{ background: tone }}
    >
      {/* Inner shell: square below xl (so sub-xl stack reads as a clean
          specimen grid), auto-fill at xl (grid 1fr rows decide the height). */}
      <div className="aspect-square xl:aspect-auto h-full w-full relative">
        <button
          type="button"
          onClick={() => onSelectCategory(id)}
          aria-label={label}
          className="group absolute inset-0 block text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/35 focus-visible:ring-inset"
          style={{ touchAction: "manipulation" }}
        >
          {heroSrc ? (
            <img
              src={heroSrc}
              srcSet={heroSrcSet}
              sizes={
                wide
                  ? "(min-width: 1280px) 24vw, (min-width: 1024px) 30vw, (min-width: 640px) 56vw, 96vw"
                  : "(min-width: 1280px) 12vw, (min-width: 1024px) 15vw, (min-width: 640px) 28vw, 48vw"
              }
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
      </div>
    </li>
  );
}
