import { useEffect, useRef, useState, useCallback } from "react";
import type { GalleryProject } from "@/content/gallery-projects";
import { GalleryEmptyFilmstrip } from "./GalleryEmptyFilmstrip";
import { GalleryProjectPanel } from "./GalleryProjectPanel";

// ---------------------------------------------------------------------------
// GalleryFilmstrip
//
// Owns the horizontal rail, activeIndex, progress indicator, and selected-
// project state. When `projects` is empty it delegates to
// GalleryEmptyFilmstrip so the page still feels like a gallery.
//
// When `projects` has real entries:
//   - each card opens GalleryProjectPanel on click
//   - keyboard ←/→ moves activeIndex
//   - panel manages its own scroll lock
// ---------------------------------------------------------------------------

interface GalleryFilmstripProps {
  projects: GalleryProject[];
}

export function GalleryFilmstrip({ projects }: GalleryFilmstripProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selected, setSelected] = useState<GalleryProject | null>(null);

  // Track horizontal scroll progress for the rule under the rail.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const onScroll = () => {
      const max = rail.scrollWidth - rail.clientWidth;
      setProgress(max > 0 ? rail.scrollLeft / max : 0);

      // activeIndex = card whose center is closest to the rail viewport center
      const cards = Array.from(rail.querySelectorAll<HTMLElement>("[data-rail-card]"));
      const railCenter = rail.scrollLeft + rail.clientWidth / 2;
      let bestIdx = 0;
      let bestDist = Infinity;
      cards.forEach((c, i) => {
        const cardCenter = c.offsetLeft + c.offsetWidth / 2;
        const d = Math.abs(cardCenter - railCenter);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      });
      setActiveIndex(bestIdx);
    };
    onScroll();
    rail.addEventListener("scroll", onScroll, { passive: true });
    return () => rail.removeEventListener("scroll", onScroll);
  }, [projects.length]);

  const scrollToCard = useCallback((idx: number) => {
    const rail = railRef.current;
    if (!rail) return;
    const card = rail.querySelectorAll<HTMLElement>("[data-rail-card]")[idx];
    if (!card) return;
    rail.scrollTo({
      left: card.offsetLeft - 24,
      behavior: "smooth",
    });
  }, []);

  // Keyboard navigation across the rail (when no panel open).
  useEffect(() => {
    if (selected) return;
    if (projects.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollToCard(Math.min(projects.length - 1, activeIndex + 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrollToCard(Math.max(0, activeIndex - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, projects.length, scrollToCard, selected]);

  if (projects.length === 0) {
    return <GalleryEmptyFilmstrip />;
  }

  return (
    <div className="mt-12">
      <div
        ref={railRef}
        className="-mx-6 lg:-mx-12 px-6 lg:px-12 overflow-x-auto no-scrollbar snap-x snap-mandatory"
      >
        <ol className="flex gap-6 lg:gap-10 pb-6">
          {projects.map((p, i) => (
            <li
              key={p.number}
              data-rail-card
              className="snap-start shrink-0 w-[78vw] sm:w-[60vw] md:w-[44vw] lg:w-[34vw] xl:w-[28vw]"
            >
              <button
                type="button"
                onClick={() => setSelected(p)}
                className="block text-left w-full group focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/40 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal"
              >
                <div className="flex items-baseline gap-4 mb-3">
                  <span className="font-display text-xl text-cream/40 tabular-nums">
                    {p.number}
                  </span>
                  <div className="flex-1 border-t border-cream/10" />
                  <span className="text-[10px] uppercase tracking-[0.22em] text-cream/45">
                    {p.location} · {p.year}
                  </span>
                </div>

                <div
                  className="relative w-full overflow-hidden"
                  style={{ aspectRatio: "3/2" }}
                >
                  <img
                    src={p.heroImage.src}
                    alt={p.heroImage.alt}
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                  />
                </div>

                <p className="mt-4 font-display text-2xl text-cream uppercase tracking-[0.04em]">
                  {p.name}
                </p>
              </button>
            </li>
          ))}
        </ol>
      </div>

      {/* Progress rule */}
      <div
        className="mt-2 h-px w-full bg-cream/10 overflow-hidden"
        aria-hidden
      >
        <div
          className="h-full bg-cream/40 transition-[width] duration-200"
          style={{ width: `${Math.max(8, progress * 100)}%` }}
        />
      </div>

      {selected && (
        <GalleryProjectPanel
          project={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
