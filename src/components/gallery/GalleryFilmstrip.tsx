import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { GalleryProject } from "@/content/gallery-projects";
import { GalleryProjectCard } from "./GalleryProjectCard";

interface GalleryFilmstripProps {
  projects: GalleryProject[];
  onOpen: (index: number, sourceEl?: HTMLElement | null) => void;
  onActiveChange?: (index: number) => void;
}

export function GalleryFilmstrip({
  projects,
  onOpen,
  onActiveChange,
}: GalleryFilmstripProps) {
  const scrollerRef = useRef<HTMLUListElement | null>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Reset on projects change (filter swap)
  useEffect(() => {
    setActiveIndex(0);
    onActiveChange?.(0);
    scrollerRef.current?.scrollTo({ left: 0, behavior: "instant" as ScrollBehavior });
  }, [projects, onActiveChange]);

  // IntersectionObserver: pick the most-visible card
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const visibility = new Map<number, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const i = Number((e.target as HTMLElement).dataset.index);
          if (Number.isNaN(i)) continue;
          visibility.set(i, e.intersectionRatio);
        }
        let best = 0;
        let bestRatio = -1;
        for (const [i, r] of visibility) {
          if (r > bestRatio) {
            bestRatio = r;
            best = i;
          }
        }
        setActiveIndex((prev) => {
          if (prev === best) return prev;
          onActiveChange?.(best);
          return best;
        });
      },
      { root, threshold: [0.25, 0.5, 0.75, 0.95] },
    );
    itemRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [projects, onActiveChange]);

  const total = projects.length;
  const padded = (n: number) => String(n).padStart(2, "0");

  const scrollToIndex = useCallback((i: number) => {
    const clamped = Math.max(0, Math.min(i, itemRefs.current.length - 1));
    const el = itemRefs.current[clamped];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      scrollToIndex(activeIndex + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      scrollToIndex(activeIndex - 1);
    }
  };

  const atStart = activeIndex <= 0;
  const atEnd = activeIndex >= total - 1;
  const showControls = total > 1;

  return (
    <section aria-label="Project filmstrip" className="pb-10 lg:pb-14">
      <div className="relative">
        <ul
          ref={scrollerRef}
          tabIndex={0}
          onKeyDown={onKeyDown}
          className="flex gap-8 lg:gap-10 overflow-x-auto snap-x snap-mandatory scroll-smooth px-6 lg:px-12 pb-4 scrollbar-slim focus:outline-none"
        >
          {projects.map((p, i) => (
            <GalleryProjectCard
              key={p.number}
              project={p}
              index={i}
              active={i === activeIndex}
              onOpen={(sourceEl) => onOpen(i, sourceEl)}
              registerRef={(el) => (itemRefs.current[i] = el)}
            />
          ))}
          <li aria-hidden className="shrink-0 w-6 lg:w-12" />
        </ul>

        {showControls && (
          <>
            <button
              type="button"
              aria-label="Previous project"
              aria-disabled={atStart}
              disabled={atStart}
              onClick={() => scrollToIndex(activeIndex - 1)}
              className="hidden lg:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 items-center justify-center rounded-full border border-cream/20 bg-charcoal/40 backdrop-blur-md text-cream transition-all hover:bg-charcoal/70 hover:border-cream/40 disabled:opacity-20 disabled:pointer-events-none focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/50"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next project"
              aria-disabled={atEnd}
              disabled={atEnd}
              onClick={() => scrollToIndex(activeIndex + 1)}
              className="hidden lg:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 items-center justify-center rounded-full border border-cream/20 bg-charcoal/40 backdrop-blur-md text-cream transition-all hover:bg-charcoal/70 hover:border-cream/40 disabled:opacity-20 disabled:pointer-events-none focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/50"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Progress + scroll hint */}
      <div className="px-6 lg:px-12 mt-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-5">
          <span className="text-cream/55 text-[10px] uppercase tracking-[0.28em] tabular-nums">
            {padded(activeIndex + 1)}
          </span>
          <div className="flex-1 flex items-center gap-1">
            {projects.map((p, i) => (
              <button
                key={p.number}
                type="button"
                aria-label={`Go to project ${i + 1} of ${total}`}
                onClick={() => scrollToIndex(i)}
                className="group flex-1 h-3 flex items-center focus:outline-none"
              >
                <span
                  className={`block w-full h-px transition-colors ${
                    i === activeIndex
                      ? "bg-cream/55"
                      : "bg-cream/10 group-hover:bg-cream/30 group-focus-visible:bg-cream/40"
                  }`}
                />
              </button>
            ))}
          </div>
          <span className="text-cream/30 text-[10px] uppercase tracking-[0.28em] tabular-nums">
            {padded(total)}
          </span>
          <span className="hidden sm:inline-block text-cream/30 text-[10px] uppercase tracking-[0.28em] ml-1">
            ← →
          </span>
        </div>
      </div>
    </section>
  );
}
