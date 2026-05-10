import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { GalleryProject } from "@/content/gallery-projects";
import { GalleryLightboxRail } from "./GalleryLightboxRail";
import { CrossfadeImage } from "./CrossfadeImage";
import { LightboxParallax } from "./LightboxParallax";
import { acquireScrollLock } from "@/lib/scroll-lock";
import { renderUrl, renderSrcSet } from "@/lib/storage-image";

// ---------------------------------------------------------------------------
// GalleryLightbox
//
// Cinematic split-screen overlay. Hero plate left (~⅔), charcoal sidebar
// right (~⅓) with project metadata + PREV/NEXT project. Bottom filmstrip
// shows all plates of the current project. Mouse, keyboard, wheel — all wired.
// ---------------------------------------------------------------------------

interface GalleryLightboxProps {
  projects: GalleryProject[];
  initialProjectIndex: number;
  onClose: () => void;
}

export function GalleryLightbox({
  projects,
  initialProjectIndex,
  onClose,
}: GalleryLightboxProps) {
  const [projectIndex, setProjectIndex] = useState(initialProjectIndex);
  const [plateIndex, setPlateIndex] = useState(0);
  const [plateChanging, setPlateChanging] = useState(false);

  const project = projects[projectIndex];
  const plates =
    project.detailImages.length > 0 ? project.detailImages : [project.heroImage];
  const plate = plates[plateIndex];

  // Lock body scroll while open. Shared ref-counted lock; safe under
  // overlapping owners (e.g. nav menu opening over the lightbox).
  useEffect(() => {
    const release = acquireScrollLock();
    return release;
  }, []);

  // Reset plate when project changes.
  useEffect(() => {
    setPlateIndex(0);
  }, [projectIndex]);

  // Briefly suppress parallax during plate transitions so the in-flight
  // image isn't thrown sideways while CrossfadeImage decodes the next one.
  useEffect(() => {
    setPlateChanging(true);
    const t = window.setTimeout(() => setPlateChanging(false), 360);
    return () => window.clearTimeout(t);
  }, [plateIndex, projectIndex]);

  const stepPlate = useCallback(
    (dir: -1 | 1) => {
      setPlateIndex((i) => {
        const next = i + dir;
        if (next < 0) return 0;
        if (next > plates.length - 1) return plates.length - 1;
        return next;
      });
    },
    [plates.length]
  );

  const stepProject = useCallback(
    (dir: -1 | 1) => {
      setProjectIndex((i) => {
        const next = i + dir;
        if (next < 0) return projects.length - 1;
        if (next > projects.length - 1) return 0;
        return next;
      });
    },
    [projects.length]
  );

  // Keyboard nav.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        stepPlate(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        stepPlate(-1);
      } else if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        stepProject(1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        stepProject(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, stepPlate, stepProject]);

  // Wheel-to-plate on the hero side, debounced so each notch counts once.
  const heroRef = useRef<HTMLDivElement>(null);
  const wheelLockRef = useRef(false);
  const touchRef = useRef<{ x: number; y: number; t: number } | null>(null);
  useEffect(() => {
    const node = heroRef.current;
    if (!node) return;
    const onWheel = (e: WheelEvent) => {
      // Hijack ONLY when the user's intent is horizontal — trackpad two-finger
      // sideways swipe, shift+wheel, or a horizontal mouse wheel. A plain
      // vertical mouse wheel must pass through so the page (and the sidebar
      // on short viewports) can still scroll naturally.
      const dx = e.deltaX;
      const dy = e.deltaY;
      const horizontalDominant = Math.abs(dx) > Math.abs(dy);
      if (!horizontalDominant) return;
      e.preventDefault();
      if (wheelLockRef.current) return;
      if (Math.abs(dx) < 8) return;
      wheelLockRef.current = true;
      stepPlate(dx > 0 ? 1 : -1);
      window.setTimeout(() => {
        wheelLockRef.current = false;
      }, 280);
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [stepPlate]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${project.name} — gallery view`}
      className="fixed inset-0 z-50 bg-charcoal text-cream flex flex-col"
    >
      {/* Main split */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Hero plate — wheel target */}
        <div
          ref={heroRef}
          onTouchStart={(e) => {
            const t = e.touches[0];
            touchRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
          }}
          onTouchEnd={(e) => {
            const start = touchRef.current;
            if (!start) return;
            const t = e.changedTouches[0];
            const dx = t.clientX - start.x;
            const dy = t.clientY - start.y;
            const dt = Date.now() - start.t;
            touchRef.current = null;
            if (dt > 600) return;
            if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
            stepPlate(dx < 0 ? 1 : -1);
          }}
          className="relative flex-1 min-h-0 bg-[color-mix(in_oklab,var(--cream)_4%,var(--charcoal))] overflow-hidden touch-pan-y"
        >
          <CrossfadeImage
            srcKey={plate.src}
            src={renderUrl(plate.src, { width: 1600, quality: 78 })}
            srcSet={renderSrcSet(plate.src, [1200, 1600, 2000], 78)}
            sizes="(min-width: 1024px) 66vw, 100vw"
            alt={plate.alt}
          />

          {/* Preload neighbors for instant swap */}
          {plates.map((p, i) => {
            if (i === plateIndex) return null;
            if (Math.abs(i - plateIndex) > 1) return null;
            return (
              <link
                key={p.src}
                rel="preload"
                as="image"
                href={renderUrl(p.src, { width: 1600, quality: 78 })}
                imageSrcSet={renderSrcSet(p.src, [1200, 1600, 2000], 78)}
                imageSizes="(min-width: 1024px) 66vw, 100vw"
              />
            );
          })}

          {/* Plate paddles */}
          <button
            type="button"
            aria-label="Previous plate"
            onClick={() => stepPlate(-1)}
            disabled={plateIndex === 0}
            className="absolute left-3 lg:left-5 top-1/2 -translate-y-1/2 h-12 w-12 flex items-center justify-center rounded-full border border-cream/25 bg-charcoal/55 backdrop-blur-sm text-cream/80 hover:text-cream hover:border-cream/60 disabled:opacity-20 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/40"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next plate"
            onClick={() => stepPlate(1)}
            disabled={plateIndex === plates.length - 1}
            className="absolute right-3 lg:right-5 top-1/2 -translate-y-1/2 h-12 w-12 flex items-center justify-center rounded-full border border-cream/25 bg-charcoal/55 backdrop-blur-sm text-cream/80 hover:text-cream hover:border-cream/60 disabled:opacity-20 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/40"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar */}
        <aside className="relative shrink-0 w-full lg:w-[380px] xl:w-[440px] bg-charcoal border-t lg:border-t-0 lg:border-l border-cream/10 px-8 lg:px-12 py-8 lg:py-12 flex flex-col">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close gallery"
            className="absolute top-6 right-6 h-9 w-9 flex items-center justify-center text-cream/60 hover:text-cream transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/40"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mt-2 lg:mt-12">
            <p className="text-[10px] uppercase tracking-[0.32em] text-cream/40 tabular-nums">
              {(plateIndex + 1).toString().padStart(2, "0")}
              <span className="mx-2 text-cream/20">/</span>
              {plates.length.toString().padStart(2, "0")}
            </p>
            <h2 className="mt-10 font-display text-[clamp(2.25rem,3.4vw,3.25rem)] leading-[1.02] tracking-[-0.005em]">
              {project.name}
            </h2>
            <div className="mt-6 h-px w-10 bg-cream/25" aria-hidden />
            <p className="mt-5 text-[10px] uppercase tracking-[0.32em] text-cream/55 tabular-nums">
              {project.year}
            </p>
          </div>

          <div className="mt-auto pt-12 flex items-center justify-between gap-6 border-t border-cream/10 -mx-8 lg:-mx-12 px-8 lg:px-12 pt-6">
            <button
              type="button"
              onClick={() => stepProject(-1)}
              className="group inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-cream/55 hover:text-cream transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/40"
            >
              <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              Prev
            </button>
            <button
              type="button"
              onClick={() => stepProject(1)}
              className="group inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-cream/55 hover:text-cream transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/40"
            >
              Next
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </aside>
      </div>

      {/* Filmstrip */}
      <GalleryLightboxRail
        images={plates}
        currentIndex={plateIndex}
        onSelect={setPlateIndex}
      />
    </div>
  );
}
