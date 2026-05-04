import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { GalleryMasthead, type CategoryFilter } from "@/components/gallery/GalleryMasthead";
import { GalleryCardsTrack } from "@/components/gallery/GalleryCardsTrack";
import { GalleryLightbox } from "@/components/gallery/GalleryLightbox";
import {
  galleryProjects,
  type GalleryProject,
} from "@/content/gallery-projects";
import pressGlassBar from "@/assets/press-glass-bar.png";

// ---------------------------------------------------------------------------
// Gallery — selected project proof, cinematic exhibition mode
//
// Honors the v0 deployed design: dark masthead, "{n} Environments" headline,
// category pills, big horizontal cards track (mouse-friendly), Project Index
// strip, and a split-screen lightbox with thumbnail filmstrip.
// All imagery is real, served from the storage manifest. No fakes.
// ---------------------------------------------------------------------------

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "The Gallery — Selected Projects | Eclectic Hive" },
      {
        name: "description",
        content:
          "Selected projects from Eclectic Hive — cinematic event environments designed, fabricated, and produced from Denver, Colorado.",
      },
      { property: "og:title", content: "The Gallery — Eclectic Hive" },
      {
        property: "og:description",
        content:
          "Selected projects from Eclectic Hive — cinematic event environments.",
      },
    ],
  }),
  component: GalleryPage,
});

// Build a stable list of regions present in the gallery data, in the order
// they first appear in the project list. "All" is always pinned first.
const REGION_FILTERS: CategoryFilter[] = (() => {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const p of galleryProjects) {
    if (!seen.has(p.region)) {
      seen.add(p.region);
      ordered.push(p.region);
    }
  }
  return ["All", ...ordered];
})();

function GalleryPage() {
  const [filter, setFilter] = useState<CategoryFilter>("All");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const jumpRef = useRef<((index: number) => void) | null>(null);

  const visibleProjects: GalleryProject[] = useMemo(() => {
    if (filter === "All") return galleryProjects;
    return galleryProjects.filter((p) => p.region === filter);
  }, [filter]);

  const counts: Record<CategoryFilter, number> = useMemo(() => {
    const base: Record<CategoryFilter, number> = {
      All: galleryProjects.length,
    };
    for (const f of REGION_FILTERS) {
      if (f !== "All") base[f] = 0;
    }
    for (const p of galleryProjects) base[p.region] = (base[p.region] ?? 0) + 1;
    return base;
  }, []);

  const handleOpen = (visibleIndex: number) => {
    const project = visibleProjects[visibleIndex];
    if (!project) return;
    const realIndex = galleryProjects.findIndex((p) => p.number === project.number);
    setOpenIndex(realIndex >= 0 ? realIndex : 0);
  };

  return (
    <main
      className="min-h-screen bg-charcoal text-cream"
      style={{ paddingTop: "var(--nav-h)" }}
    >
      <GalleryMasthead
        total={galleryProjects.length}
        visibleCount={visibleProjects.length}
        active={filter}
        counts={counts}
        onChange={setFilter}
        filters={REGION_FILTERS}
        projects={visibleProjects}
        onOpen={handleOpen}
        jumpRef={jumpRef}
      />

      <section className="px-6 lg:px-12">
        <div className="max-w-[1600px] mx-auto">
          <GalleryCardsTrack
            projects={visibleProjects}
            onOpen={handleOpen}
            onActiveChange={setActiveIndex}
            jumpRef={jumpRef}
          />
        </div>
      </section>

      {/* CTA — editorial colophon */}
      <section className="px-6 lg:px-12 mt-28 mb-16">
        <div className="max-w-[1600px] mx-auto">
          <div className="border-t border-cream/10 pt-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-baseline">
            <div className="lg:col-span-2">
              <p className="text-[10px] uppercase tracking-[0.32em] text-cream/40 tabular-nums">
                — Next
              </p>
            </div>

            <div className="lg:col-span-7">
              <p className="font-display text-[clamp(1.5rem,2.4vw,2.25rem)] leading-[1.2] tracking-[-0.005em] text-cream/90 max-w-[34ch]">
                Considering an environment of your own?
                <span className="text-cream/45"> We take on a small number of projects each year.</span>
              </p>
            </div>

            <div className="lg:col-span-3 lg:text-right">
              <Link
                to="/contact"
                className="group inline-flex items-baseline gap-3 text-[11px] uppercase tracking-[0.3em] text-cream hover:text-cream/70 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/40 focus-visible:ring-offset-4 focus-visible:ring-offset-charcoal"
              >
                <span className="border-b border-cream/40 group-hover:border-cream/70 pb-1 transition-colors">
                  Begin a conversation
                </span>
                <span aria-hidden className="translate-y-[-1px] transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* As Featured In — glass press bar */}
      <section aria-labelledby="press-heading" className="px-6 lg:px-12 pb-10">
        <div className="max-w-[1600px] mx-auto">
          <h2
            id="press-heading"
            className="text-[10px] uppercase tracking-[0.32em] text-cream/40 text-center mb-4"
          >
            As Featured In
          </h2>
          <img
            src={pressGlassBar}
            alt="Featured in Elle, Harper's Bazaar, The Knot, Vogue, Martha Stewart Weddings, and Brides"
            className="w-full max-w-[1400px] mx-auto h-auto select-none"
            loading="lazy"
            draggable={false}
          />
        </div>
      </section>

      {openIndex !== null && (
        <GalleryLightbox
          projects={galleryProjects}
          initialProjectIndex={openIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </main>
  );
}

// (no map slot — mapbox is retired from the gallery route)
