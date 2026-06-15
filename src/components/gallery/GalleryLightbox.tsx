import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import type { GalleryProject } from "@/content/gallery-projects";
import { GalleryLightboxRail } from "./GalleryLightboxRail";
import { CrossfadeImage } from "./CrossfadeImage";
import { LightboxParallax } from "./LightboxParallax";
import { ShopTheLookRail } from "./ShopTheLookRail";
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
  const pending = !!project.pending;
  const plates =
    project.detailImages.length > 0 ? project.detailImages : [project.heroImage];
  const plate = plates[plateIndex];
  const plateIsStorage = plate.src.includes("/storage/v1/object/public/");

  // Lock body scroll while open. Shared ref-counted lock; safe under
  // overlapping owners (e.g. nav menu opening over the lightbox).
  useEffect(() => {
    const release = acquireScrollLock();
    return release;
  }, []);

  // Focus trap. Capture previously-focused element, move focus into the
  // dialog on mount, cycle Tab/Shift-Tab within the dialog, restore focus on
  // unmount. Pairs with role="dialog" + aria-modal="true" below.
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previouslyFocused = (typeof document !== "undefined"
      ? document.activeElement
      : null) as HTMLElement | null;
    const root = dialogRef.current;
    if (!root) return;
    const FOCUSABLE =
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])';
    const getFocusable = () =>
      Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute("aria-hidden") && el.offsetParent !== null
      );
    const focusables = getFocusable();
    (focusables[0] ?? root).focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const list = getFocusable();
      if (list.length === 0) {
        e.preventDefault();
        root.focus();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    root.addEventListener("keydown", onKey);
    return () => {
      root.removeEventListener("keydown", onKey);
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };
  }, []);

  // Zoom controller — pinch/double-click/ctrl-wheel zoom on the hero plate.
  // Track scale so paddles know when to defer to panning.
  const zoomApiRef = useRef<{ resetTransform: () => void } | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const isZoomed = zoomScale > 1.02;

  // Reset plate (and zoom) when project changes.
  useEffect(() => {
    setPlateIndex(0);
    zoomApiRef.current?.resetTransform();
  }, [projectIndex]);

  // Reset zoom when plate changes inside a project.
  useEffect(() => {
    zoomApiRef.current?.resetTransform();
  }, [plateIndex]);


  // plateChanging is now driven by CrossfadeImage's actual decode lifecycle
  // (see onLoadingChange below). The safety timer here only fires if a decode
  // hangs past the ceiling — keeps the lightbox from getting stuck frozen.
  const safetyTimerRef = useRef<number | null>(null);
  const handleLoadingChange = useCallback((loading: boolean) => {
    if (safetyTimerRef.current !== null) {
      window.clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
    setPlateChanging(loading);
    if (loading) {
      safetyTimerRef.current = window.setTimeout(() => {
        setPlateChanging(false);
        safetyTimerRef.current = null;
      }, 1200);
    }
  }, []);
  useEffect(() => {
    return () => {
      if (safetyTimerRef.current !== null) {
        window.clearTimeout(safetyTimerRef.current);
      }
    };
  }, []);

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
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${project.name} — gallery view`}
      tabIndex={-1}
      className="fixed inset-0 z-50 bg-charcoal text-cream flex flex-col focus:outline-none"
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
          <LightboxParallax plateKey={plate.src} disabled={plateChanging || pending}>
            <TransformWrapper
              initialScale={1}
              minScale={1}
              maxScale={4}
              centerOnInit
              doubleClick={{ mode: "toggle", step: 1.6, animationTime: 220 }}
              wheel={{ step: 0.18, activationKeys: ["Control", "Meta"] }}
              pinch={{ step: 5 }}
              panning={{ disabled: !isZoomed, velocityDisabled: true }}
              onInit={(ref) => {
                zoomApiRef.current = ref;
              }}
              onTransformed={(_ref, state: { scale: number }) => {
                setZoomScale(state.scale);
              }}
            >
              <TransformComponent
                wrapperClass="!w-full !h-full"
                contentClass="!w-full !h-full"
              >
                <div className="relative w-full h-full">
                  <CrossfadeImage
                    srcKey={plate.src}
                    src={plateIsStorage ? renderUrl(plate.src, { width: 1600, quality: 78 }) : plate.src}
                    srcSet={plateIsStorage ? renderSrcSet(plate.src, [1200, 1600, 2000], 78) : ""}
                    sizes="(min-width: 1024px) 66vw, 100vw"
                    alt={plate.alt}
                    onLoadingChange={handleLoadingChange}
                  />
                </div>
              </TransformComponent>
            </TransformWrapper>
          </LightboxParallax>

          {pending && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center px-8">
                <p className="text-[10px] uppercase tracking-[0.4em] text-cream/45">
                  Imagery In Preparation
                </p>
                <p className="mt-6 font-display text-[clamp(1.5rem,2vw,2rem)] text-cream/80 leading-tight">
                  {project.name}
                </p>
                <p className="mt-3 text-[10px] uppercase tracking-[0.32em] text-cream/40">
                  {project.planner}
                </p>
              </div>
            </div>
          )}

          {/* Preload neighbors (±2) for instant decode on next/prev. */}
          {!pending && plates.map((p, i) => {
            if (i === plateIndex) return null;
            if (Math.abs(i - plateIndex) > 2) return null;
            if (!p.src.includes("/storage/v1/object/public/")) return null;
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

          {/* Persistent counter badge — always visible bottom-left on the hero. */}
          {!pending && (
            <div
              aria-hidden
              className="absolute left-4 lg:left-6 bottom-4 lg:bottom-6 z-10 pointer-events-none select-none"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-charcoal/55 backdrop-blur-sm border border-cream/15 text-cream/80 text-[10px] uppercase tracking-[0.28em] tabular-nums">
                <span>{(plateIndex + 1).toString().padStart(2, "0")}</span>
                <span className="text-cream/35">/</span>
                <span className="text-cream/55">{plates.length.toString().padStart(2, "0")}</span>
              </div>
            </div>
          )}

          {/* Plate paddles — hidden when zoomed (panning takes over) or pending */}
          {!pending && !isZoomed && (
            <>
              <button
                type="button"
                aria-label="Previous plate"
                onClick={() => stepPlate(-1)}
                disabled={plateIndex === 0}
                className="absolute left-3 lg:left-5 top-1/2 -translate-y-1/2 z-10 h-12 w-12 flex items-center justify-center rounded-full border border-cream/25 bg-charcoal/55 backdrop-blur-sm text-cream/80 hover:text-cream hover:border-cream/60 disabled:opacity-20 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/40"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next plate"
                onClick={() => stepPlate(1)}
                disabled={plateIndex === plates.length - 1}
                className="absolute right-3 lg:right-5 top-1/2 -translate-y-1/2 z-10 h-12 w-12 flex items-center justify-center rounded-full border border-cream/25 bg-charcoal/55 backdrop-blur-sm text-cream/80 hover:text-cream hover:border-cream/60 disabled:opacity-20 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/40"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

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
              {pending
                ? "—"
                : `${(plateIndex + 1).toString().padStart(2, "0")}`}
              {!pending && <span className="mx-2 text-cream/20">/</span>}
              {!pending && plates.length.toString().padStart(2, "0")}
            </p>
            <p className="mt-10 text-[10px] uppercase tracking-[0.32em] text-cream/55">
              {project.planner}
            </p>
            <h2 className="mt-3 font-display text-[clamp(2.25rem,3.4vw,3.25rem)] leading-[1.02] tracking-[-0.005em]">
              {project.name}
            </h2>
            <div className="mt-6 h-px w-10 bg-cream/25" aria-hidden />
            <p className="mt-5 text-[10px] uppercase tracking-[0.32em] text-cream/55 tabular-nums">
              {project.kind} · {project.year}
            </p>
            {project.summary && (
              <p className="mt-6 text-sm leading-relaxed text-cream/65 normal-case max-w-[42ch]">
                {project.summary}
              </p>
            )}
            {!pending && project.relatedInventorySlugs && project.relatedInventorySlugs.length > 0 && (
              <ShopTheLookRail slugs={project.relatedInventorySlugs} />
            )}
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

      {/* Filmstrip — hidden for pending projects (no real plates yet) */}
      {!pending && (
        <GalleryLightboxRail
          images={plates}
          currentIndex={plateIndex}
          onSelect={setPlateIndex}
        />
      )}
    </div>
  );
}
