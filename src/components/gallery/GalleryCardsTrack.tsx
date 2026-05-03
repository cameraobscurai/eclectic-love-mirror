import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { GalleryProject } from "@/content/gallery-projects";
import { GalleryEnvironmentCard } from "./GalleryEnvironmentCard";
import { GalleryProjectIndex } from "./GalleryProjectIndex";

// ---------------------------------------------------------------------------
// GalleryCardsTrack
//
// Horizontal scroll-snap track of huge environment cards.
// Mouse-friendly: vertical-wheel → horizontal-scroll, drag-to-scroll,
// visible paddle buttons, slot indicator + helper line, project index below.
// ---------------------------------------------------------------------------

interface GalleryCardsTrackProps {
  projects: GalleryProject[];
  onOpen: (index: number) => void;
  onActiveChange?: (index: number) => void;
  /**
   * Imperative handle for parents (e.g. the map) to jump the rail to a card.
   * Stable across renders.
   */
  jumpRef?: { current: ((index: number) => void) | null };
}

export function GalleryCardsTrack({
  projects,
  onOpen,
  onActiveChange,
  jumpRef,
}: GalleryCardsTrackProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const scrubRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  // Track scroll position → activeIndex + progress + paddle availability.
  const recompute = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const max = rail.scrollWidth - rail.clientWidth;
    setProgress(max > 0 ? rail.scrollLeft / max : 0);
    setCanPrev(rail.scrollLeft > 4);
    setCanNext(rail.scrollLeft < max - 4);

    const cards = Array.from(rail.querySelectorAll<HTMLElement>("[data-card]"));
    const railCenter = rail.scrollLeft + rail.clientWidth / 2;
    let bestIdx = 0;
    let bestDist = Infinity;
    cards.forEach((c, i) => {
      const center = c.offsetLeft + c.offsetWidth / 2;
      const d = Math.abs(center - railCenter);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    });
    setActiveIndex((prev) => {
      if (prev !== bestIdx) onActiveChange?.(bestIdx);
      return bestIdx;
    });
  }, [onActiveChange]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    recompute();
    rail.addEventListener("scroll", recompute, { passive: true });
    window.addEventListener("resize", recompute);
    return () => {
      rail.removeEventListener("scroll", recompute);
      window.removeEventListener("resize", recompute);
    };
  }, [projects.length, recompute]);

  // Mouse wheel → horizontal scroll. Trackpad horizontal gestures pass through.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const onWheel = (e: WheelEvent) => {
      // If user is already scrolling horizontally (trackpad), let it through.
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      // Translate vertical wheel into horizontal pan on this rail.
      e.preventDefault();
      rail.scrollBy({ left: e.deltaY, behavior: "auto" });
    };
    rail.addEventListener("wheel", onWheel, { passive: false });
    return () => rail.removeEventListener("wheel", onWheel);
  }, []);

  // Drag-to-scroll.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    let isDown = false;
    let startX = 0;
    let startLeft = 0;
    let moved = false;

    const onDown = (e: PointerEvent) => {
      // Only primary button; ignore clicks originating on a button (like the card).
      if (e.button !== 0) return;
      isDown = true;
      moved = false;
      startX = e.clientX;
      startLeft = rail.scrollLeft;
    };
    const onMove = (e: PointerEvent) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      rail.scrollLeft = startLeft - dx;
    };
    const onUp = (e: PointerEvent) => {
      if (!isDown) return;
      isDown = false;
      // Suppress the click that follows a drag.
      if (moved) {
        const target = e.target as HTMLElement | null;
        target?.addEventListener(
          "click",
          (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
          },
          { capture: true, once: true }
        );
      }
    };

    rail.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      rail.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const scrollToIndex = useCallback((idx: number) => {
    const rail = railRef.current;
    if (!rail) return;
    const clamped = Math.max(0, Math.min(projects.length - 1, idx));
    const card = rail.querySelectorAll<HTMLElement>("[data-card]")[clamped];
    if (!card) return;
    // Center the card in the rail.
    const target = card.offsetLeft - (rail.clientWidth - card.offsetWidth) / 2;
    rail.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [projects.length]);

  // Expose scrollToIndex to parents (e.g. the map).
  useEffect(() => {
    if (jumpRef) jumpRef.current = scrollToIndex;
    return () => {
      if (jumpRef) jumpRef.current = null;
    };
  }, [jumpRef, scrollToIndex]);

  const paddle = (dir: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: dir * rail.clientWidth * 0.85, behavior: "smooth" });
  };

  // Keyboard navigation when the rail (or any descendant) is focused.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollToIndex(activeIndex + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrollToIndex(activeIndex - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        scrollToIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        scrollToIndex(projects.length - 1);
      } else if (e.key === "Enter" || e.key === " ") {
        // Open the focused card if any.
        const target = e.target as HTMLElement | null;
        if (target && target.closest("[data-card-trigger]")) return; // let card handle
      }
    };
    rail.addEventListener("keydown", onKey);
    return () => rail.removeEventListener("keydown", onKey);
  }, [activeIndex, projects.length, scrollToIndex]);

  // Interactive scrubber — drag to scrub, click to jump.
  useEffect(() => {
    const scrub = scrubRef.current;
    const rail = railRef.current;
    if (!scrub || !rail) return;
    let dragging = false;

    const apply = (clientX: number) => {
      const rect = scrub.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const max = rail.scrollWidth - rail.clientWidth;
      rail.scrollTo({ left: ratio * max, behavior: "auto" });
    };
    const onDown = (e: PointerEvent) => {
      dragging = true;
      scrub.setPointerCapture(e.pointerId);
      apply(e.clientX);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      apply(e.clientX);
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      try { scrub.releasePointerCapture(e.pointerId); } catch { /* noop */ }
    };
    scrub.addEventListener("pointerdown", onDown);
    scrub.addEventListener("pointermove", onMove);
    scrub.addEventListener("pointerup", onUp);
    scrub.addEventListener("pointercancel", onUp);
    return () => {
      scrub.removeEventListener("pointerdown", onDown);
      scrub.removeEventListener("pointermove", onMove);
      scrub.removeEventListener("pointerup", onUp);
      scrub.removeEventListener("pointercancel", onUp);
    };
  }, []);

  if (projects.length === 0) {
    return (
      <p className="px-6 lg:px-12 max-w-[1600px] mx-auto text-[15px] italic text-cream/55">
        No projects in this category.
      </p>
    );
  }

  return (
    <div>
      <div className="relative">
        {/* Track */}
        <div
          ref={railRef}
          className="-mx-6 lg:-mx-12 px-6 lg:px-12 overflow-x-auto no-scrollbar snap-x snap-mandatory cursor-grab active:cursor-grabbing select-none"
          style={{ scrollBehavior: "smooth" }}
        >
          <ol className="flex gap-6 lg:gap-10 pb-4">
            {projects.map((p, i) => (
              <li
                key={p.number}
                data-card
                className="snap-center shrink-0 w-[78vw] sm:w-[58vw] md:w-[48vw] lg:w-[42vw] xl:w-[38vw]"
              >
                <GalleryEnvironmentCard
                  project={p}
                  eager={i === 0}
                  onOpen={() => onOpen(i)}
                />
              </li>
            ))}
          </ol>
        </div>

        {/* Paddle buttons — visible to mouse users */}
        <button
          type="button"
          aria-label="Previous project"
          onClick={() => paddle(-1)}
          disabled={!canPrev}
          className="hidden md:flex absolute left-2 lg:left-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 items-center justify-center rounded-full border border-cream/25 bg-charcoal/60 backdrop-blur-sm text-cream/80 hover:text-cream hover:border-cream/60 disabled:opacity-25 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/40"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Next project"
          onClick={() => paddle(1)}
          disabled={!canNext}
          className="hidden md:flex absolute right-2 lg:right-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 items-center justify-center rounded-full border border-cream/25 bg-charcoal/60 backdrop-blur-sm text-cream/80 hover:text-cream hover:border-cream/60 disabled:opacity-25 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/40"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Slot indicator + progress rule */}
      <div className="mt-8 flex items-center gap-4 max-w-md mx-auto">
        <span className="text-[10px] uppercase tracking-[0.28em] text-cream/55 tabular-nums">
          {(activeIndex + 1).toString().padStart(2, "0")}
        </span>
        <div className="flex-1 h-px bg-cream/10 overflow-hidden">
          <div
            className="h-full bg-cream/45 transition-[width] duration-300"
            style={{ width: `${Math.max(8, progress * 100)}%` }}
          />
        </div>
        <span className="text-[10px] uppercase tracking-[0.28em] text-cream/35 tabular-nums">
          {projects.length.toString().padStart(2, "0")}
        </span>
      </div>
      <p className="mt-3 text-center text-[13px] italic text-cream/45">
        Drag or scroll to explore
      </p>

      <GalleryProjectIndex
        projects={projects}
        activeIndex={activeIndex}
        onJump={scrollToIndex}
      />
    </div>
  );
}
