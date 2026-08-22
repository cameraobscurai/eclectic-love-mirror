import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { GalleryProject } from "@/content/gallery-projects";
import { renderUrl, renderSrcSet } from "@/lib/storage-image";
import { gallerySlug } from "@/lib/gallery-orders";
import { prefetchImage } from "@/lib/prefetch-image";
import { useIsMobile } from "@/hooks/use-mobile";

// ---------------------------------------------------------------------------
// Portfolio Wall — secondary, lower-page gallery.
//
// Uniform 4:5 plates on a strict grid. Every tile is the same size so the wall
// reads as an archive contact sheet, not a ragged masonry dump. Plates are
// interleaved round-robin so adjacent tiles never come from the same event,
// and each one deep-links to `/gallery/{slug}?plate=N`.
//
// Loading strategy (no pop-in, no glitch):
//   · Fixed 4:5 box → zero layout shift; the grid is final before any bitmap.
//   · First row eager + high priority; everything else lazy with generous
//     rootMargin via native loading="lazy".
//   · Each tile fades in only once its own bitmap is decoded. Images already
//     in cache are detected synchronously via `img.complete` on the ref, so
//     revisits paint at full opacity on frame one (no gratuitous re-fade).
//   · Hover / focus / touch warms the *lightbox-sized* variant so clicking
//     through is instant instead of a second network round-trip.
// ---------------------------------------------------------------------------

const DESKTOP_INITIAL = 24;
const DESKTOP_STEP = 24;
const MOBILE_INITIAL = 10;
const MOBILE_STEP = 10;
const MAX_PER_PROJECT = 6;
const EAGER_COUNT = 10;

interface Plate {
  key: string;
  src: string;
  alt: string;
  slug: string;
  plate: number;
  name: string;
}

function buildPlates(projects: GalleryProject[]): Plate[] {
  const usable = projects.filter((p) => !p.pending && p.detailImages.length > 0);
  const out: Plate[] = [];
  for (let pass = 0; pass < MAX_PER_PROJECT; pass++) {
    for (const p of usable) {
      const img = p.detailImages[pass];
      if (!img || img.video) continue;
      out.push({
        key: `${p.number}-${pass}`,
        src: img.src,
        alt: img.alt,
        slug: gallerySlug(p),
        plate: pass + 1,
        name: p.name,
      });
    }
  }
  return out;
}

function PlateTile({ plate, index }: { plate: Plate; index: number }) {
  const eager = index < EAGER_COUNT;
  const [ready, setReady] = useState(false);
  const warmedRef = useRef(false);

  // Cached images never fire onLoad after hydration — read `.complete` the
  // moment the node mounts so they skip the fade entirely.
  const attach = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete && node.naturalWidth > 0) setReady(true);
  }, []);

  const warm = useCallback(() => {
    if (warmedRef.current) return;
    warmedRef.current = true;
    prefetchImage(
      renderUrl(plate.src, { width: 1600, quality: 78 }),
      renderSrcSet(plate.src, [1200, 1600, 2000], 78),
    );
  }, [plate.src]);

  return (
    <Link
      to="/gallery/$slug"
      params={{ slug: plate.slug }}
      search={{ plate: plate.plate }}
      aria-label={plate.name}
      preload="intent"
      onPointerEnter={warm}
      onTouchStart={warm}
      onFocus={warm}
      className="group relative block aspect-[4/5] overflow-hidden bg-cream/[0.04] focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/60"
    >
      <img
        ref={attach}
        src={renderUrl(plate.src, { width: 560, quality: 72 })}
        srcSet={renderSrcSet(plate.src, [320, 480, 640, 900], 72)}
        sizes="(min-width: 1024px) 19vw, (min-width: 640px) 32vw, 50vw"
        alt={plate.alt}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={index < 5 ? "high" : "low"}
        decoding="async"
        draggable={false}
        onLoad={() => setReady(true)}
        style={{ opacity: ready ? undefined : 0 }}
        className="absolute inset-0 h-full w-full object-cover opacity-90 transition-[opacity,transform] duration-[700ms] ease-out will-change-[opacity,transform] group-hover:opacity-100 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
    </Link>
  );
}

export function PortfolioWall({ projects }: { projects: GalleryProject[] }) {
  const isMobile = useIsMobile();
  const plates = useMemo(() => buildPlates(projects), [projects]);
  const initialCount = isMobile ? MOBILE_INITIAL : DESKTOP_INITIAL;
  const step = isMobile ? MOBILE_STEP : DESKTOP_STEP;
  const [shown, setShown] = useState(initialCount);

  // Reset the visible window when the breakpoint changes so mobile doesn't
  // inherit a 30-item desktop scroll, and desktop doesn't stay collapsed.
  useEffect(() => {
    setShown(initialCount);
  }, [initialCount]);

  // Track the real column count so the visible window always lands on a
  // complete row — no orphan cell, no spacer patch.
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [columnCount, setColumnCount] = useState(5);

  useEffect(() => {
    const el = gridRef.current;
    if (!el || typeof window === "undefined") return;

    const update = () => {
      const columns = window.getComputedStyle(el).gridTemplateColumns.split(" ").length;
      setColumnCount((prev) => (prev === columns ? prev : columns));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (plates.length === 0) return null;

  // Round the window UP to a full row so the grid always ends flush.
  const cols = Math.max(1, columnCount);
  const rounded = Math.min(Math.ceil(shown / cols) * cols, plates.length);
  const visible = plates.slice(0, rounded);
  const hasMore = rounded < plates.length;

  // Only the very last page can be short (plates.length isn't row-aligned).
  const fillCount = (cols - (visible.length % cols)) % cols;

  return (
    <section
      aria-labelledby="portfolio-wall-heading"
      className="bg-charcoal px-0 lg:px-12 pt-16 pb-16 lg:pt-24 lg:pb-28"
    >
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-baseline justify-between gap-6 mb-6 px-6 lg:px-0 lg:mb-8">
          <h2
            id="portfolio-wall-heading"
            className="text-cream/40 text-[10px] uppercase tracking-[0.34em]"
          >
            The Portfolio
          </h2>
          <span className="text-cream/25 text-[10px] uppercase tracking-[0.34em] tabular-nums">
            {plates.length}
          </span>
        </div>

        <div
          ref={gridRef}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-cream/10"
        >
          {visible.map((plate, i) => (
            <PlateTile key={plate.key} plate={plate} index={i} />
          ))}
          {fillCount > 0 &&
            Array.from({ length: fillCount }).map((_, i) => (
              <div
                key={`portfolio-spacer-${i}`}
                className="aspect-[4/5] bg-charcoal"
                aria-hidden="true"
              />
            ))}
        </div>

        {hasMore && (
          <div className="mt-12 flex justify-center">
            <button
              type="button"
              onClick={() => setShown((n) => n + step)}
              className="border border-cream/25 px-10 py-4 text-[10px] uppercase tracking-[0.32em] text-cream/80 transition-colors hover:border-cream/60 hover:text-cream focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/50"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
