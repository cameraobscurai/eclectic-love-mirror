import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { GalleryProject } from "@/content/gallery-projects";
import { GalleryLightboxRail } from "./GalleryLightboxRail";

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
  useEffect(() => {
    const node = heroRef.current;
    if (!node) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (wheelLockRef.current) return;
      const dy = e.deltaY;
      if (Math.abs(dy) < 8) return;
      wheelLockRef.current = true;
      stepPlate(dy > 0 ? 1 : -1);
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
          className="relative flex-1 min-h-0 bg-[color-mix(in_oklab,var(--cream)_4%,var(--charcoal))] overflow-hidden"
        >
          <img
            key={plate.src}
            src={plate.src}
            alt={plate.alt}
            className="absolute inset-0 w-full h-full object-cover animate-fade-in"
            draggable={false}
          />

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
        <aside className="relative shrink-0 w-full lg:w-[400px] xl:w-[460px] bg-charcoal border-t lg:border-t-0 lg:border-l border-cream/10 px-7 lg:px-10 py-7 lg:py-10 flex flex-col">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close gallery"
            className="absolute top-5 right-5 h-9 w-9 flex items-center justify-center text-cream/70 hover:text-cream transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/40"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mt-2 lg:mt-10">
            <p className="text-[10px] uppercase tracking-[0.3em] text-cream/45 tabular-nums">
              {(plateIndex + 1).toString().padStart(2, "0")} /{" "}
              {plates.length.toString().padStart(2, "0")}
            </p>
            <p className="mt-8 text-[10px] uppercase tracking-[0.3em] text-cream/55">
              {project.region.toUpperCase()}
            </p>
            <h2 className="mt-4 font-display text-[clamp(2.5rem,4vw,3.5rem)] leading-[1.02] tracking-[-0.005em]">
              {project.name}
            </h2>
            <div className="mt-4 h-px w-12 bg-cream/25" aria-hidden />
            <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-cream/65">
              {project.location} · {project.kind} · {project.year}
            </p>

            {project.summary && (
              <p className="mt-7 text-[14px] leading-relaxed text-cream/70 max-w-sm">
                {project.summary}
              </p>
            )}
          </div>

          <div className="mt-auto pt-10 flex items-center justify-between gap-6">
            <button
              type="button"
              onClick={() => stepProject(-1)}
              className="group inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-cream/65 hover:text-cream transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/40"
            >
              <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              Prev Project
            </button>
            <button
              type="button"
              onClick={() => stepProject(1)}
              className="group inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-cream/65 hover:text-cream transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/40"
            >
              Next Project
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
