import { useEffect, useRef, useState } from "react";
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

  return (
    <section aria-label="Project filmstrip" className="pb-10 lg:pb-14">
      <ul
        ref={scrollerRef}
        className="flex gap-8 lg:gap-10 overflow-x-auto snap-x snap-mandatory scroll-smooth px-6 lg:px-12 pb-4 scrollbar-slim"
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

      {/* Progress + scroll hint */}
      <div className="px-6 lg:px-12 mt-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-5">
          <span className="text-cream/55 text-[10px] uppercase tracking-[0.28em] tabular-nums">
            {padded(activeIndex + 1)}
          </span>
          <div className="flex-1 h-px bg-cream/10 relative overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-cream/55 transition-all duration-300"
              style={{ width: `${total > 0 ? ((activeIndex + 1) / total) * 100 : 0}%` }}
            />
          </div>
          <span className="text-cream/30 text-[10px] uppercase tracking-[0.28em] tabular-nums">
            {padded(total)}
          </span>
          <span className="hidden sm:inline-block text-cream/30 text-[10px] uppercase tracking-[0.28em] ml-1">
            ↔ Scroll
          </span>
        </div>
      </div>
    </section>
  );
}
