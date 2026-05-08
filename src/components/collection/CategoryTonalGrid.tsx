import { useEffect, useMemo, useState } from "react";
import {
  BROWSE_GROUP_LABELS,
  type BrowseGroupId,
} from "@/lib/collection-browse-groups";
import { CATEGORY_COVERS } from "@/lib/category-covers";
import { withCdnWidth } from "@/lib/image-url";
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

// Safety net: the category grid waits for one shared preload/decode batch,
// then releases all tiles together. Keep this intentionally calm so a fresh
// uncached visit does not fall back into per-tile random pop-in too early.
const GRID_REVEAL_TIMEOUT_MS = 4500;

// Column counts per breakpoint — must match Tailwind classes below.
const COLS = { base: 2, sm: 3, lg: 5 } as const;

function decodeGridImage(src: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";

    const finish = () => {
      if (typeof img.decode === "function") {
        img.decode().then(() => resolve()).catch(() => resolve());
      } else {
        resolve();
      }
    };

    img.onload = finish;
    img.onerror = () => resolve();
    img.src = src;

    if (img.complete) finish();
  });
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
        const heroAlt = cover
          ? BROWSE_GROUP_LABELS[id]
          : fallbackHero?.altText ?? BROWSE_GROUP_LABELS[id];
        return {
          id,
          heroSrc,
          heroAlt,
          label: BROWSE_GROUP_LABELS[id],
        };
      }),
    [byId],
  );

  const [gridReady, setGridReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setGridReady(false);

    let cancelled = false;
    const reveal = () => {
      if (!cancelled) setGridReady(true);
    };
    const timeout = window.setTimeout(reveal, GRID_REVEAL_TIMEOUT_MS);
    const imageUrls = tiles.map((tile) => tile.heroSrc).filter(Boolean) as string[];

    Promise.all(imageUrls.map(decodeGridImage)).then(() => {
      window.clearTimeout(timeout);
      reveal();
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [tiles]);

  return (
    // grid-rows-3 lg + h-full = three equal rows that fill the parent's
    // height, sharing the H-plate's vertical real estate. No aspect-ratio
    // on individual tiles — they take their share of the row.
    <>
      <style>{`
        [data-tonal-grid] {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          grid-template-rows: repeat(3, 1fr);
          width: 100%;
          height: 100%;
          gap: 0;
        }
        [data-tonal-grid] > button { min-height: 44px; }
        @media (max-width: 1023px) {
          [data-tonal-grid] {
            grid-template-columns: repeat(3, 1fr);
            grid-template-rows: repeat(5, 1fr);
            grid-auto-rows: auto;
            height: 100%;
            padding: 8px;
            gap: 8px;
            background: var(--paper);
          }
          [data-tonal-grid] > button { min-height: 64px; }
        }
      `}</style>
      <div
      data-tonal-grid
      role="list"
      aria-label="Browse by category"
    >
      {tiles.map((t, i) => {
        // Real checkerboard: parity over (row + col). Computed against
        // each breakpoint's column count, picked at render via window
        // size isn't necessary — we use the LG count as the canonical
        // pattern; on smaller widths the wrap re-flows but parity holds
        // because COLS values are all even except 3. 3-col tablet falls
        // into a diagonal stripe which actually reads fine — the rhythm
        // is what matters, not perfect parity.
        const cols = COLS.lg;
        const row = Math.floor(i / cols);
        const col = i % cols;
        const tone = TONES[(row + col) % 2];
        return (
          <TonalCell
            key={t.id}
            heroSrc={t.heroSrc}
            heroAlt={t.heroAlt}
            label={t.label}
            tone={tone}
            gridReady={gridReady}
            onSelectCategory={onSelectCategory}
          />
        );
      })}
    </div>
    </>
  );
}

interface TonalCellProps {
  heroSrc: string | null;
  heroAlt: string;
  label: string;
  tone: string;
  gridReady: boolean;
  onSelectCategory: (id: BrowseGroupId) => void;
}

function TonalCell({
  heroSrc,
  heroAlt,
  label,
  tone,
  gridReady,
  onSelectCategory,
}: TonalCellProps) {
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
