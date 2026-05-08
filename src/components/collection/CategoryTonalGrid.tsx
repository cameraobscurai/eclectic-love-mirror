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

// The category grid waits for one shared preload/decode batch, then releases
// all tiles together. This bounded fallback prevents one stubborn CDN decode
// from holding the entire page in a blank state.
const GRID_REVEAL_TIMEOUT_MS = 3200;

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
    imageUrls.forEach(preloadGridImage);

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
          grid-auto-rows: minmax(180px, 1fr);
          width: 100%;
          height: 100%;
          gap: 0;
          padding-top: 12px;
          padding-bottom: clamp(72px, 9vh, 96px);
        }
        [data-tonal-grid] > button { min-height: 180px; }
        @media (max-width: 1023px) {
          [data-tonal-grid] {
            grid-template-columns: repeat(3, 1fr);
            grid-auto-rows: minmax(140px, 1fr);
            height: 100%;
            padding: 8px 8px clamp(80px, 12vh, 112px);
            gap: 8px;
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
            id={t.id}
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
  id: BrowseGroupId;
  heroSrc: string | null;
  heroAlt: string;
  label: string;
  tone: string;
  gridReady: boolean;
  onSelectCategory: (id: BrowseGroupId) => void;
}

function TonalCell({
  id,
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
      type="button"
      role="listitem"
      onClick={() => onSelectCategory(id)}
      aria-label={label}
      className="group relative min-w-0 overflow-hidden text-left transition-colors duration-300 ease-out focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/35 focus-visible:ring-inset"
      style={{ background: tone, touchAction: "manipulation" }}
    >
      {heroSrc && !gridReady ? (
        <span
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.10) 50%, rgba(0,0,0,0.04) 100%)",
            backgroundSize: "200% 100%",
            animation: "tile-shimmer 1.4s ease-in-out infinite",
            opacity: 0.45,
            transition: "opacity 300ms ease-out",
          }}
        />
      ) : null}
      {heroSrc ? (
        <img
          src={heroSrc}
          sizes="(min-width: 1024px) 20vw, (min-width: 640px) 32vw, 48vw"
          alt={heroAlt}
          width={600}
          height={480}
          loading="eager"
          decoding="async"
          {...({ fetchPriority: "high" } as Record<string, string>)}
          className="absolute inset-0 h-full w-full object-contain px-3 pt-4 pb-12 sm:px-4 sm:pt-5 sm:pb-14 transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          style={{
            opacity: gridReady ? 1 : 0,
            transition: "opacity 640ms ease-out, transform 500ms ease-out",
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
          fontSize: "clamp(9px, 1.6vw, 11px)",
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
