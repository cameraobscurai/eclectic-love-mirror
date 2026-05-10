import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BROWSE_GROUP_LABELS,
  type BrowseGroupId,
} from "@/lib/collection-browse-groups";
import { CATEGORY_COVERS, type CoverPicture } from "@/lib/category-covers";
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
// Overview is a uniform 5-column grid on md+ (3 rows × 5 = 15 tiles); on
// smaller screens tiles flow into a 2/3-col grid.
const REVEAL_COLS = 5;
const REVEAL_STEP_MS = 60;
const REVEAL_MAX_DELAY_MS = 300;
// First-row arrival beat — hold the row hidden until every image in row 1
// has resolved (or the safety timeout fires) so it reads as one event.
const FIRST_ROW_COUNT = 5;
// Safety net so a single broken image can't strand the row forever.
// Combined with AVIF covers (preset=editorial), the practical reveal lands
// in 250–400ms; this cap is just insurance against a stalled connection.
const FIRST_ROW_REVEAL_TIMEOUT_MS = 800;

/**
 * Category gallery — the "front door" to the archive.
 *
 * Brand-aligned with the rest of the Collection page: clinical white field,
 * 1px hairline grid, specimen-style imagery with deliberate breathing room,
 * left-aligned uppercase Cormorant labels with the count as quiet metadata.
 */
export function CategoryGalleryOverview({
  groups,
  onSelectCategory,
}: CategoryGalleryOverviewProps) {
  const reduced = useReducedMotion();

  // Resolve hero sources up-front so the parent owns first-row coordination.
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
          group,
          heroSrc,
          heroSrcSet,
          heroAlt,
          label: BROWSE_GROUP_LABELS[group.id],
        };
      }),
    [groups],
  );

  // Track which first-row cards have reported their image as loaded (or
  // failed/empty — anything that means "done waiting"). Once every first-row
  // slot is accounted for, flip `firstRowReady` and let the row reveal as a
  // single beat. Reduced-motion users get an immediate true.
  const firstRowSlots = Math.min(FIRST_ROW_COUNT, resolved.length);
  const [firstRowDoneCount, setFirstRowDoneCount] = useState(0);
  const [firstRowTimedOut, setFirstRowTimedOut] = useState(false);

  // Arm the safety-net timeout once on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = window.setTimeout(
      () => setFirstRowTimedOut(true),
      FIRST_ROW_REVEAL_TIMEOUT_MS,
    );
    return () => window.clearTimeout(t);
  }, []);

  // Imperative preload of bundled category covers. Lives here (not in the
  // route head()) because this component only mounts on the overview branch
  // — direct category links and the search view never pay this cost. This
  // is a workaround: TanStack Start's head() is route-level, so we can't
  // condition a preload on which child component renders without splitting
  // the route. Revisit if the overview becomes its own route.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const links: HTMLLinkElement[] = [];
    for (const href of Object.values(CATEGORY_COVERS)) {
      if (!href) continue;
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = href as string;
      link.fetchPriority = "high";
      document.head.appendChild(link);
      links.push(link);
    }
    return () => {
      for (const link of links) link.remove();
    };
  }, []);

  const firstRowReady =
    Boolean(reduced) ||
    firstRowDoneCount >= firstRowSlots ||
    firstRowTimedOut;

  const reportFirstRowDone = useCallback(() => {
    setFirstRowDoneCount((n) => n + 1);
  }, []);

  // Owner-curated 15-card overview, laid out as 3 rows × 5 cols on md+:
  //   sofas · chairs · benches & ottomans · cocktail tables · side tables
  //   coffee tables · dining · bar · lighting · storage
  //   pillows · throws · tableware · styling · rugs
  // The route owns the order; we just render it.
  return (
    <div className="flex h-full min-h-0 flex-col bg-white text-charcoal p-3 sm:p-4">
      <ul
        className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4"
        style={{ background: "#ffffff" }}
      >
        {resolved.map((item, idx) => {
          const isFirstRow = idx < FIRST_ROW_COUNT;
          const revealDelayMs = isFirstRow
            ? 0
            : Math.min((idx % REVEAL_COLS) * REVEAL_STEP_MS, REVEAL_MAX_DELAY_MS);
          return (
            <CategoryCard
              key={item.group.id}
              groupId={item.group.id}
              heroSrc={item.heroSrc}
              heroSrcSet={item.heroSrcSet}
              heroAlt={item.heroAlt}
              label={item.label}
              isFirstRow={isFirstRow}
              firstRowReady={firstRowReady}
              onFirstRowImageDone={isFirstRow ? reportFirstRowDone : undefined}
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
  firstRowReady: boolean;
  onFirstRowImageDone?: () => void;
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
  firstRowReady,
  onFirstRowImageDone,
  reduced,
  revealDelayMs,
  onSelectCategory,
}: CategoryCardProps) {
  const [loaded, setLoaded] = useState(false);
  const [reported, setReported] = useState(false);

  // First-row cards are mounted immediately (initial: true) so their <img>
  // requests start in parallel. Later rows wait until they're near.
  const { ref, near } = useNearViewport<HTMLLIElement>({
    rootMargin: "400px",
    initial: isFirstRow,
  });

  // Notify the parent exactly once when this first-row card's image is
  // resolved (loaded, errored, or there was no image to begin with). The
  // parent uses these signals to gate the synchronized row reveal.
  const reportDoneOnce = useCallback(() => {
    if (reported || !onFirstRowImageDone) return;
    setReported(true);
    onFirstRowImageDone();
  }, [reported, onFirstRowImageDone]);

  // No image → immediately count this slot as done (post-mount).
  useEffect(() => {
    if (isFirstRow && !heroSrc) reportDoneOnce();
    // reportDoneOnce is stable enough; we only want to fire on mount per card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reveal logic:
  // - reduced motion: always entered.
  // - first row: entered iff parent says the whole row is ready.
  // - later rows: entered iff near-viewport AND own image resolved.
  const entered = reduced
    ? true
    : isFirstRow
      ? firstRowReady
      : near && (loaded || !heroSrc);

  // First-row cards skip the cascade animation — they all reveal together
  // with no per-card delay. Later rows keep the wipe.
  const skipReveal = reduced;

  return (
    <motion.li
      ref={ref}
      className="relative aspect-[5/4] sm:aspect-[4/5] min-w-0 bg-white"
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "12px",
        background: "#ffffff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
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
              {...({ fetchPriority: isFirstRow ? "high" : "auto" } as Record<string, string>)}
              onLoad={() => {
                setLoaded(true);
                if (isFirstRow) reportDoneOnce();
              }}
              onError={() => {
                // Treat as "done waiting" so one broken image doesn't
                // strand the entire first-row reveal.
                if (isFirstRow) reportDoneOnce();
              }}
              className="absolute inset-0 h-full w-full object-contain p-3 sm:p-5 md:p-6 will-change-opacity group-hover:opacity-90"
              style={{
                // First-row images are revealed by the row-wide gate (parent
                // flips `entered` once everyone's ready), so we paint them
                // at full opacity from mount inside the hidden card. Later
                // rows keep the per-image fade for a softer scroll arrival.
                opacity: isFirstRow ? 1 : loaded ? 1 : 0,
                transition: isFirstRow ? "none" : "opacity 380ms ease-out",
              }}
            />
          ) : (
            <div className="absolute inset-0" />
          )}
        </div>

        {/* Frosted-glass label overlay. */}
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
            opacity: isFirstRow || loaded || !heroSrc ? 1 : 0.6,
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
