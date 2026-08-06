import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { GalleryProject } from "@/content/gallery-projects";
import { renderUrl, renderSrcSet } from "@/lib/storage-image";
import { gallerySlug } from "@/lib/gallery-orders";

// ---------------------------------------------------------------------------
// Portfolio Wall — secondary, lower-page gallery.
//
// The Project Index above is a *list of projects*. This is a wall of *work*:
// individual plates pulled round-robin across every project so adjacent tiles
// never come from the same event. Each tile deep-links back into its project
// page at that plate (`/gallery/{slug}?plate=N`), so the wall is an entry
// point, not a dead end.
// ---------------------------------------------------------------------------

const INITIAL_COUNT = 24;
const STEP = 24;
const MAX_PER_PROJECT = 6;

interface Plate {
  key: string;
  src: string;
  alt: string;
  isVideo: boolean;
  slug: string;
  plate: number;
  planner: string;
  name: string;
}

/** Round-robin interleave: one plate from each project per pass. */
function buildPlates(projects: GalleryProject[]): Plate[] {
  const usable = projects.filter((p) => !p.pending && p.detailImages.length > 0);
  const out: Plate[] = [];
  for (let pass = 0; pass < MAX_PER_PROJECT; pass++) {
    for (const p of usable) {
      const img = p.detailImages[pass];
      if (!img) continue;
      out.push({
        key: `${p.number}-${pass}`,
        src: img.src,
        alt: img.alt,
        isVideo: !!img.video,
        slug: gallerySlug(p),
        plate: pass + 1,
        planner: p.planner,
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
      className="bg-charcoal px-6 lg:px-12 pt-20 pb-16 lg:pt-28 lg:pb-24"
    >
      <div className="max-w-[1800px] mx-auto">
        <div className="flex items-baseline justify-between gap-6 mb-10 lg:mb-14">
          <h2
            id="portfolio-wall-heading"
            className="text-cream/40 text-xs uppercase tracking-[0.3em]"
          >
            The Portfolio
          </h2>
          <span className="text-cream/25 text-[10px] uppercase tracking-[0.32em] tabular-nums">
            {plates.length} Plates
          </span>
        </div>

        {/* CSS columns masonry — preserves each plate's native ratio, no crop. */}
        <div className="columns-2 md:columns-3 xl:columns-4 gap-3 lg:gap-4 [column-fill:_balance]">
          {visible.map((plate) => (
            <Link
              key={plate.key}
              to="/gallery/$slug"
              params={{ slug: plate.slug }}
              search={{ plate: plate.plate }}
              className="group mb-3 lg:mb-4 block break-inside-avoid overflow-hidden bg-cream/5 focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/50"
            >
              <div className="relative overflow-hidden">
                <img
                  src={renderUrl(plate.src, { width: 640, quality: 72 })}
                  srcSet={renderSrcSet(plate.src, [400, 640, 900], 72)}
                  sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw"
                  alt={plate.alt}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="w-full h-auto object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
                {plate.isVideo && (
                  <span
                    aria-hidden
                    className="absolute bottom-3 left-3 text-[9px] uppercase tracking-[0.32em] text-cream/80"
                  >
                    Film
                  </span>
                )}
                <span className="pointer-events-none absolute inset-x-0 bottom-0 p-3 opacity-0 translate-y-1 transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-0 bg-gradient-to-t from-charcoal/80 to-transparent">
                  <span className="block text-[10px] uppercase tracking-[0.28em] text-cream truncate">
                    {plate.planner}
                  </span>
                  <span className="block text-[9px] uppercase tracking-[0.28em] text-cream/55 truncate">
                    {plate.name}
                  </span>
                </span>
              </div>
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
