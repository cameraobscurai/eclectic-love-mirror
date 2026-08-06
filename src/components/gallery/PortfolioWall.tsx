import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { GalleryProject } from "@/content/gallery-projects";
import { renderUrl, renderSrcSet } from "@/lib/storage-image";
import { gallerySlug } from "@/lib/gallery-orders";

// ---------------------------------------------------------------------------
// Portfolio Wall — secondary, lower-page gallery.
//
// Uniform 4:5 plates on a strict grid. Every tile is the same size so the wall
// reads as an archive contact sheet, not a ragged masonry dump. Plates are
// interleaved round-robin so adjacent tiles never come from the same event,
// and each one deep-links to `/gallery/{slug}?plate=N`.
// ---------------------------------------------------------------------------

const INITIAL_COUNT = 30;
const STEP = 30;
const MAX_PER_PROJECT = 6;

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

export function PortfolioWall({ projects }: { projects: GalleryProject[] }) {
  const plates = useMemo(() => buildPlates(projects), [projects]);
  const [shown, setShown] = useState(INITIAL_COUNT);

  if (plates.length === 0) return null;

  const visible = plates.slice(0, shown);
  const hasMore = shown < plates.length;

  return (
    <section
      aria-labelledby="portfolio-wall-heading"
      className="bg-charcoal px-6 lg:px-12 pt-20 pb-20 lg:pt-24 lg:pb-28"
    >
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-baseline justify-between gap-6 mb-8">
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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-cream/10">
          {visible.map((plate) => (
            <Link
              key={plate.key}
              to="/gallery/$slug"
              params={{ slug: plate.slug }}
              search={{ plate: plate.plate }}
              aria-label={plate.name}
              className="group relative block aspect-[4/5] overflow-hidden bg-charcoal focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/60"
            >
              <img
                src={renderUrl(plate.src, { width: 560, quality: 72 })}
                srcSet={renderSrcSet(plate.src, [320, 480, 640], 72)}
                sizes="(min-width: 1024px) 19vw, (min-width: 640px) 32vw, 48vw"
                alt={plate.alt}
                loading="lazy"
                decoding="async"
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover transition-all duration-[900ms] ease-out opacity-90 group-hover:opacity-100 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />
            </Link>
          ))}
        </div>

        {hasMore && (
          <div className="mt-12 flex justify-center">
            <button
              type="button"
              onClick={() => setShown((n) => n + STEP)}
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
