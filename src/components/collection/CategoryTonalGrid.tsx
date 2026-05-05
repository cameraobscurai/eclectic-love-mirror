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
  /** Number of columns on the widest breakpoint — used to compute the
   *  checkerboard tone offset so adjacent cells never share a tone. */
  columns?: number;
}

// 3-tone neutral palette sampled to read alongside cream/sand brand tokens.
// Cycled by (row + col) % 3 so no neighbor (above, left, right, below)
// repeats — the grid reads as a seamless tonal checker.
const TONES = ["#efece6", "#d9d4cb", "#c8c2b6"] as const;

const FIRST_ROW_COUNT = 5;
const FIRST_ROW_REVEAL_TIMEOUT_MS = 1500;

/**
 * Seamless tonal grid — Collection landing's right pane.
 *
 * One cell per browse group, no gutters, alternating warm/cool tones.
 * Companion to <HivePanel> on the left. Replaces the previous gallery
 * overview for the overview state only.
 */
export function CategoryTonalGrid({
  groups,
  onSelectCategory,
  columns = 5,
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
        };
      }),
    [groups],
  );

  // Coordinated first-row reveal — same discipline as the previous overview
  // so the page paints as a single beat, not popcorn.
  const firstRowSlots = Math.min(FIRST_ROW_COUNT, resolved.length);
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
    firstRowDoneCount >= firstRowSlots || firstRowTimedOut;

  const reportFirstRowDone = useCallback(() => {
    setFirstRowDoneCount((n) => n + 1);
  }, []);

  return (
    <ul
      className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      style={{ gap: 0 }}
    >
      {resolved.map((item, idx) => {
        const col = idx % columns;
        const row = Math.floor(idx / columns);
        const tone = TONES[(row + col) % TONES.length];
        const isFirstRow = idx < FIRST_ROW_COUNT;
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
      className="relative aspect-[5/4] min-w-0"
      style={{ background: tone }}
    >
      <button
        type="button"
        onClick={() => onSelectCategory(id)}
        aria-label={label}
        className="group relative block h-full w-full text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/35 focus-visible:ring-inset"
        style={{ touchAction: "manipulation" }}
      >
        {heroSrc ? (
          <img
            src={heroSrc}
            srcSet={heroSrcSet}
            sizes="(min-width: 1280px) 16vw, (min-width: 1024px) 18vw, (min-width: 640px) 28vw, 48vw"
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
            className="absolute inset-0 h-full w-full object-contain p-6 sm:p-8 transition-transform duration-500 ease-out group-hover:scale-[1.03]"
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
    </li>
  );
}
