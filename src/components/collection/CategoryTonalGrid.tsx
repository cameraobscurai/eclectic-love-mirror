import { useEffect, useMemo, useState } from "react";
import {
  BROWSE_GROUP_LABELS,
  type BrowseGroupId,
} from "@/lib/collection-browse-groups";
import { CATEGORY_COVERS, coverUrl } from "@/lib/category-covers";
import { withCdnWidth } from "@/lib/image-url";
import type { CollectionProduct } from "@/lib/phase3-catalog";

interface CategoryTonalGridProps {
  groups: Array<{ id: BrowseGroupId; products: CollectionProduct[] }>;
  onSelectCategory: (id: BrowseGroupId) => void;
}

/**
 * Editorial flat grid — 5×3 desktop, 3 cols tablet/mobile.
 * Desktop tiles use the SAME square-ish module as the H-plate width so the
 * overview reads as one composed plate, not a tall H beside a tiny strip.
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
// Owner-curated 15-tile order (3 rows × 5 cols on desktop):
//   sofas · chairs · benches & ottomans · cocktail tables · side tables
//   coffee tables · dining · bar · lighting · storage
//   pillows · throws · tableware · styling · rugs
const ORDER: BrowseGroupId[] = [
  "sofas", "chairs", "benches-ottomans", "cocktail-tables", "side-tables",
  "coffee-tables", "dining", "bar", "lighting", "storage",
  "pillows", "throws", "tableware", "styling", "rugs",
];

// Greyscale checker pair from the brand baseline.
const TONES = ["#ffffff", "#f1f1f1"] as const;

// Column counts per breakpoint — must match Tailwind classes below.
const COLS = { base: 2, sm: 3, lg: 5 } as const;

const COVER_SCALE: Partial<Record<BrowseGroupId, number>> = {
  sofas: 1,
  chairs: 0.98,
  "benches-ottomans": 0.94,
  "cocktail-tables": 0.94,
  "side-tables": 0.76,
  "coffee-tables": 1,
  dining: 1,
  bar: 1,
  lighting: 0.72,
  storage: 1,
  pillows: 1,
  throws: 0.86,
  tableware: 1,
  styling: 0.96,
  rugs: 0.82,
};


function preloadGridImage(src: string) {
  const existing = Array.from(
    document.head.querySelectorAll<HTMLLinkElement>('link[rel="preload"][as="image"]'),
  ).some((link) => link.href === src);
  if (existing) return;

  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = src;
  link.fetchPriority = "high";
  document.head.appendChild(link);
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
      // Render every tile in the curated 15-card order, even if its bucket
      // is empty — the overview is a fixed taxonomy, not a dynamic list.
      // Empty tiles still navigate to their section (filter pipeline handles
      // an empty result gracefully).
      ORDER.map((id) => {
        const products = byId.get(id) ?? [];
        const cover = coverUrl(CATEGORY_COVERS[id]);
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

  // Track actual rendered column count so the checker parity matches what
  // the user sees. Without this, mobile (3 cols) was using LG parity (5)
  // and the tone fell into diagonal stripes instead of a real checker.
  const [renderedCols, setRenderedCols] = useState<number>(COLS.lg);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setRenderedCols(mq.matches ? COLS.sm : COLS.lg);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Per-tile fade-in: each <img> reveals on its own onLoad. We still warm
  // the browser cache up-front via <link rel="preload">, but ONLY for the
  // first row (5 tiles on desktop). Preloading all 15 saturates the
  // browser's priority pool and nothing actually gets priority.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const imageUrls = tiles
      .slice(0, 5)
      .map((tile) => tile.heroSrc)
      .filter(Boolean) as string[];
    imageUrls.forEach(preloadGridImage);
  }, [tiles]);


  return (
    <>
      <style>{`
        [data-tonal-grid] {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          grid-template-rows: repeat(3, minmax(0, 1fr));
          width: 100%;
          max-width: none;
          height: 100%;
          min-height: 100%;
          margin-inline: auto;
          gap: 0;
          padding: 0;
        }
        [data-tonal-grid] > button {
          min-height: 0;
          height: 100%;
        }


        @media (max-width: 1023px) {
          [data-tonal-grid] {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            grid-template-rows: none;
            max-width: none;
            height: auto;
            min-height: 0;
            padding: 0;
            gap: 0;
            background: var(--paper);
          }
          [data-tonal-grid] > button { aspect-ratio: 1 / 1; height: auto; }
        }
      `}</style>

      <div
      data-tonal-grid
      role="list"
      aria-label="Browse by category"
    >
      {tiles.map((t, i) => {
        // Real checkerboard parity, computed from the actual rendered
        // column count (3 mobile / 5 desktop). Tracked via matchMedia so
        // it updates on resize.
        const cols = renderedCols;
        const row = Math.floor(i / cols);
        const col = i % cols;
        const tone = TONES[(row + col) % 2];
        return (
          <TonalCell
            key={t.id}
            id={t.id}
            heroSrc={t.heroSrc}
            heroAlt={t.heroAlt}
            label={t.label}
            tone={tone}
            priority={i < 5}
            onSelectCategory={onSelectCategory}
          />
        );
      })}

    </div>
    </>
  );
}

interface TonalCellProps {
  id: BrowseGroupId;
  heroSrc: string | null;
  heroAlt: string;
  label: string;
  tone: string;
  priority: boolean;
  onSelectCategory: (id: BrowseGroupId) => void;
}

function TonalCell({
  id,
  heroSrc,
  heroAlt,
  label,
  tone,
  priority,
  onSelectCategory,
}: TonalCellProps) {
  return (
    // Fills its grid cell. Image absolute-fits; label absolute bottom-left
    // so the silhouette gets the full cell area for presence.
    <button
      type="button"
      role="listitem"
      onClick={() => onSelectCategory(id)}
      aria-label={label}
      className="group relative min-w-0 overflow-hidden text-left transition-colors duration-300 ease-out focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/35 focus-visible:ring-inset"
      style={{ background: tone, touchAction: "manipulation" }}
    >
      <span className="absolute inset-x-3 top-3 h-[60%] sm:inset-x-5 sm:top-5 sm:h-[58%] grid place-items-center pointer-events-none">
        {heroSrc ? (
          <img
            src={heroSrc}
            sizes="(min-width: 1024px) 20vw, (min-width: 640px) 32vw, 48vw"
            alt={heroAlt}
            width={600}
            height={480}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            {...({ fetchPriority: priority ? "high" : "auto" } as Record<string, string>)}
            draggable={false}
            className="block max-h-full max-w-full object-contain transition-transform duration-[260ms] ease-out group-hover:scale-[1.02]"
            style={{
              width: `${(COVER_SCALE[id] ?? 0.72) * 100}%`,
              objectPosition: "center center",
            }}
          />
        ) : null}
      </span>


      <span
        className="absolute left-2 right-2 bottom-2 sm:left-4 sm:right-4 sm:bottom-3 uppercase pointer-events-none"
        style={{
          fontFamily: "var(--font-sans)",
          letterSpacing: "0.08em",
          color: "#1a1a1a",
          lineHeight: 1.15,
          fontSize: "clamp(10px, 0.9vw, 12px)",
          // 2-line allowance, no ellipsis — labels like "BENCHES &
          // OTTOMANS" and "COCKTAIL TABLES" wrap naturally instead of clip.
          wordBreak: "normal",
          overflowWrap: "break-word",
          hyphens: "none",
        }}
      >
        {label}
      </span>
    </button>
  );
}
