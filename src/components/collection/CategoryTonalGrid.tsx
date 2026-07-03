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
// Owner-curated 15-tile order (3 rows × 5 cols on desktop):
//   sofas · chairs · benches & ottomans · cocktail tables · side tables
//   coffee tables · dining · bar · lighting · storage
//   pillows · throws · tableware · styling · rugs
const ORDER: BrowseGroupId[] = [
  "sofas", "chairs", "benches-ottomans", "cocktail-tables", "side-tables",
  "coffee-tables", "dining", "bar", "lighting", "storage",
  "pillows", "throws", "tableware", "styling", "rugs",
];

// Greyscale checker pair — flat white + soft grey. Bumped from #f1f1f1 to
// #ebebeb so the checker reads at scale without going warm.
const TONES = ["#ffffff", "#ebebeb"] as const;

// Per-category padding hints. Image silhouettes vary wildly — a rug fills
// its frame, a side-table is a thin vertical, a chandelier hangs from the
// top. Without per-category tuning every tile uses the same padding and
// half look marooned. Values are CSS shorthand "T R B L".
// Bottom is always larger to clear the label.
const PADDING_BY_GROUP: Partial<Record<BrowseGroupId, string>> = {
  rugs: "2rem 2rem 3rem 2rem",
  pillows: "2rem 2.5rem 3rem 2.5rem",
  throws: "2rem 2rem 3rem 2rem",
  // Portrait covers (side-tables 208×234, lighting 245×294) need extra
  // vertical inset — object-contain otherwise sizes them to full cell
  // height and they read 30–40% larger than the landscape peers.
  "side-tables": "3.75rem 3rem 4rem 3rem",
  lighting: "3rem 3rem 3.5rem 3rem",
  "cocktail-tables": "2rem 2.5rem 3rem 2.5rem",
  sofas: "2rem 2rem 3rem 2rem",
  "coffee-tables": "2rem 2rem 3rem 2rem",
  "benches-ottomans": "2rem 2rem 3rem 2rem",
  bar: "2rem 2rem 3rem 2rem",
  dining: "2rem 2rem 3rem 2rem",
  storage: "2rem 2rem 3rem 2rem",
};
const DEFAULT_PADDING = "2rem 2.5rem 3rem 2.5rem";

// Column counts per breakpoint — must match Tailwind classes below.
const COLS = { base: 2, sm: 3, lg: 5 } as const;


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
    // grid-rows-3 lg + h-full = three equal rows that fill the parent's
    // height, sharing the H-plate's vertical real estate. No aspect-ratio
    // on individual tiles — they take their share of the row.
    <>
      <style>{`
        [data-tonal-grid] {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          grid-auto-rows: minmax(260px, 1fr);
          width: 100%;
          max-width: 1600px;
          margin-inline: auto;
          height: 100%;
          gap: 0;
          padding: 0;
        }
        [data-tonal-grid] > button { min-height: 260px; }
        @media (max-width: 1023px) {
          [data-tonal-grid] {
            grid-template-columns: repeat(3, 1fr);
            grid-auto-rows: minmax(140px, 1fr);
            max-width: none;
            height: 100%;
            padding: 0;
            gap: 0;
            background: var(--paper);
          }
          [data-tonal-grid] > button { min-height: 140px; }
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
            padding={PADDING_BY_GROUP[t.id] ?? DEFAULT_PADDING}
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
  padding: string;
  priority: boolean;
  onSelectCategory: (id: BrowseGroupId) => void;
}

function TonalCell({
  id,
  heroSrc,
  heroAlt,
  label,
  tone,
  padding,
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
          className="absolute inset-0 h-full w-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.04] will-change-transform"
          style={{
            padding,
            objectPosition: "center center",
          }}
        />
      ) : null}

      <span
        className="absolute left-2 right-2 bottom-2 sm:left-4 sm:right-4 sm:bottom-4 uppercase pointer-events-none"
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
