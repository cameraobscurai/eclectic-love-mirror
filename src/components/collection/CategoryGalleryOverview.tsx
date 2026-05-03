import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BROWSE_GROUP_LABELS,
  type BrowseGroupId,
} from "@/lib/collection-browse-groups";
import { CATEGORY_COVERS } from "@/lib/category-covers";
import { withCdnWidth, buildCdnSrcSet } from "@/lib/image-url";
import { useNearViewport } from "@/hooks/useNearViewport";
import type { CollectionProduct } from "@/lib/phase3-catalog";

interface CategoryGalleryOverviewProps {
  groups: Array<{
    id: BrowseGroupId;
    products: CollectionProduct[];
  }>;
  onSelectCategory: (id: BrowseGroupId) => void;
}

// Row-aware reveal — same column-modulo cascade used by the product grid.
// Widest grid is xl:6 cols; on narrower breakpoints the wipe still reads
// left→right because column 1 always gets 0ms.
const REVEAL_COLS = 6;
const REVEAL_STEP_MS = 60;
const REVEAL_MAX_DELAY_MS = 300;
// First row appears together on initial paint — no perceptible cascade for
// above-the-fold content. Rows 2+ reveal as scroll brings them into view.
const FIRST_ROW_COUNT = 6;

/**
 * Category gallery — the "front door" to the archive.
 *
 * Brand-aligned with the rest of the Collection page: clinical white field,
 * 1px hairline grid, specimen-style imagery with deliberate breathing room,
 * left-aligned uppercase Cormorant labels with the count as quiet metadata.
 *
 * No gradients, no dark photographic overlays, no bouncy hover scales —
 * the same surgical/editorial register as the product grid.
 */
export function CategoryGalleryOverview({
  groups,
  onSelectCategory,
}: CategoryGalleryOverviewProps) {
  const reduced = useReducedMotion();

  return (
    <div className="flex h-full min-h-0 flex-col bg-white text-charcoal p-3 sm:p-4">
      {/* White grid — cards lift off the white field via soft shadow + radius.
          Mobile keeps 2 columns (silhouettes stay generous) but uses a shorter
          aspect ratio so ~4 rows fit above the fold instead of ~2. Desktop
          retains the portrait specimen frame. */}
      <ul
        className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4"
        style={{ background: "#ffffff" }}
      >
        {groups.map((group, idx) => {
          const cover = CATEGORY_COVERS[group.id];
          const fallbackHero = group.products.find((p) => p.primaryImage)
            ?.primaryImage;
          const rawHero = cover ?? fallbackHero?.url ?? null;
          const heroSrc = rawHero ? withCdnWidth(rawHero, 750) : null;
          const heroSrcSet = rawHero
            ? buildCdnSrcSet(rawHero, [400, 600, 900]) || undefined
            : undefined;
          const heroAlt = cover
            ? BROWSE_GROUP_LABELS[group.id]
            : fallbackHero?.altText ?? BROWSE_GROUP_LABELS[group.id];
          const label = BROWSE_GROUP_LABELS[group.id];
          // First row above-the-fold: load + prioritize eagerly so they all
          // arrive together rather than trickling in last.
          const isFirstRow = idx < FIRST_ROW_COUNT;
          // Column-modulo delay → row wipes left→right. First-row cards
          // skip the delay so initial paint isn't artificially staggered.
          const revealDelayMs = isFirstRow
            ? 0
            : Math.min((idx % REVEAL_COLS) * REVEAL_STEP_MS, REVEAL_MAX_DELAY_MS);

          return (
            <CategoryCard
              key={group.id}
              groupId={group.id}
              heroSrc={heroSrc}
              heroSrcSet={heroSrcSet}
              heroAlt={heroAlt}
              label={label}
              isFirstRow={isFirstRow}
              reduced={Boolean(reduced)}
              revealDelayMs={revealDelayMs}
              onSelectCategory={onSelectCategory}
            />
          );
        })}
      </ul>
    </div>
  );
}

interface CategoryCardProps {
  groupId: BrowseGroupId;
  heroSrc: string | null;
  heroSrcSet: string | undefined;
  heroAlt: string;
  label: string;
  isFirstRow: boolean;
  reduced: boolean;
  revealDelayMs: number;
  onSelectCategory: (id: BrowseGroupId) => void;
}

function CategoryCard({
  groupId,
  heroSrc,
  heroSrcSet,
  heroAlt,
  label,
  isFirstRow,
  reduced,
  revealDelayMs,
  onSelectCategory,
}: CategoryCardProps) {
  const [loaded, setLoaded] = useState(false);

  // First-row cards reveal immediately on mount; later rows wait until they
  // approach the viewport so the wipe fires per-row as the user scrolls.
  const { ref, near } = useNearViewport<HTMLLIElement>({
    rootMargin: "400px",
    initial: isFirstRow,
  });

  const skipReveal = reduced || isFirstRow;
  const readyToReveal = near && (loaded || !heroSrc);
  const entered = skipReveal ? true : readyToReveal;

  return (
    <motion.li
      ref={ref}
      className="relative aspect-[5/4] sm:aspect-[4/5] min-w-0 bg-white"
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "12px",
        background: "#ffffff",
        boxShadow:
          "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
        opacity: entered ? 1 : 0,
        transform: entered ? "translateY(0)" : "translateY(6px)",
        filter: entered ? "blur(0px)" : "blur(2px)",
        transition: skipReveal
          ? "none"
          : `opacity 420ms cubic-bezier(0.22, 1, 0.36, 1) ${revealDelayMs}ms, transform 420ms cubic-bezier(0.22, 1, 0.36, 1) ${revealDelayMs}ms, filter 420ms cubic-bezier(0.22, 1, 0.36, 1) ${revealDelayMs}ms`,
        willChange: entered ? "auto" : "opacity, transform, filter",
      }}
    >
      <button
        type="button"
        onClick={() => onSelectCategory(groupId)}
        className="group relative flex h-full w-full flex-col bg-white text-left transition-colors duration-200 hover:bg-black/[0.02] focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/35 focus-visible:ring-inset"
        style={{ touchAction: "manipulation" }}
        aria-label={label}
      >
        <div className="relative flex-1">
          {heroSrc ? (
            <img
              src={heroSrc}
              srcSet={heroSrcSet}
              sizes="(min-width: 1280px) 16vw, (min-width: 768px) 20vw, (min-width: 640px) 32vw, 48vw"
              alt={heroAlt}
              loading={isFirstRow ? "eager" : "lazy"}
              decoding="async"
              {...({ fetchpriority: isFirstRow ? "high" : "auto" } as Record<string, string>)}
              onLoad={() => setLoaded(true)}
              className="absolute inset-0 h-full w-full object-contain p-3 sm:p-5 md:p-6 will-change-opacity group-hover:opacity-90"
              style={{
                opacity: loaded ? 1 : 0,
                transition: "opacity 380ms ease-out",
              }}
            />
          ) : (
            <div className="absolute inset-0" />
          )}
        </div>

        {/* Frosted-glass label overlay — floats over the bottom of the
            image, inside the card frame. Name only, no count. Stays at
            partial opacity while the hero loads, then settles to full —
            keeps the card legible without feeling like a hard pop. */}
        <div
          className="px-2.5 py-1.5 sm:px-3.5 sm:py-2.5"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "rgba(255, 255, 255, 0.65)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderTop: "0.5px solid rgba(255, 255, 255, 0.8)",
            borderRadius: "0 0 12px 12px",
            opacity: loaded || !heroSrc ? 1 : 0.6,
            transition: "opacity 380ms ease-out",
          }}
        >
          <h2
            className="uppercase truncate text-[9px] sm:text-[10px]"
            style={{
              fontFamily: "var(--font-sans)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#1a1a1a",
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            {label}
          </h2>
        </div>
      </button>
    </motion.li>
  );
}
