import { useRef, useState, useCallback } from "react";
import type { GalleryProject } from "@/content/gallery-projects";
import { renderUrl } from "@/lib/storage-image";

interface GalleryIndexProps {
  projects: GalleryProject[];
  onOpen: (index: number) => void;
}

export function GalleryIndex({ projects, onOpen }: GalleryIndexProps) {
  // Cursor-following thumbnail preview (desktop ≥ lg only).
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const onMove = useCallback((e: React.MouseEvent) => {
    const el = previewRef.current;
    const wrap = containerRef.current;
    if (!el || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      el.style.transform = `translate3d(${x + 32}px, ${y - 180}px, 0)`;
    });
  }, []);

  const hoverProject = hoverIdx !== null ? projects[hoverIdx] : null;
  const hoverIsStorage =
    !!hoverProject && hoverProject.heroImage.src.includes("/storage/v1/object/public/");

  return (
    <section
      aria-labelledby="gallery-index-heading"
      className="bg-cream/5 pt-20 pb-12 lg:pt-32 lg:pb-24 px-6 lg:px-12"
    >
      <div className="max-w-[1800px] mx-auto">
        <h2
          id="gallery-index-heading"
          className="text-cream/40 text-xs uppercase tracking-[0.3em] mb-12"
        >
          Project Index
        </h2>
        <div className="grid lg:grid-cols-[1fr_minmax(440px,38vw)] gap-10 lg:gap-20 items-start">
          <div ref={containerRef} className="relative" onMouseMove={onMove}>
            <ul>
              {projects.map((p, i) => {
                const pending = !!p.pending;
                return (
                  <li key={p.number}>
                    <button
                      type="button"
                      onClick={() => onOpen(i)}
                      onMouseEnter={() => setHoverIdx(i)}
                      onMouseLeave={() => setHoverIdx((prev) => (prev === i ? null : prev))}
                      onFocus={() => setHoverIdx(i)}
                      onBlur={() => setHoverIdx(null)}
                      className="w-full group py-5 lg:py-7 border-b border-cream/10 flex items-center gap-6 lg:gap-12 text-left hover:bg-cream/5 transition-colors px-4 -mx-4 focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/40"
                    >
                      <span className="text-cream/30 text-sm tracking-[0.18em] w-8 shrink-0 tabular-nums">
                        {p.number}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-lg lg:text-2xl text-cream font-light group-hover:text-sand transition-colors truncate">
                          {p.planner}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.32em] text-cream/45 truncate">
                          {p.name}
                        </p>
                      </div>
                      {pending && (
                        <span className="hidden sm:inline-block text-[9px] uppercase tracking-[0.32em] text-cream/35 shrink-0">
                          Arriving
                        </span>
                      )}
                      <span className="text-cream/30 text-sm w-16 text-right tabular-nums shrink-0">
                        {p.year}
                      </span>
                      <span
                        aria-hidden
                        className="text-cream/30 group-hover:text-sand group-hover:translate-x-1 transition-all"
                      >
                        →
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Cursor-following thumbnail (desktop only). Pointer-events disabled so
                it never intercepts row hover. translate3d driven by rAF in onMove. */}
            <div
              ref={previewRef}
              aria-hidden
              className={`hidden lg:block pointer-events-none absolute top-0 left-0 w-[240px] h-[300px] z-20 transition-opacity duration-200 ${
                hoverProject && !hoverProject.pending ? "opacity-100" : "opacity-0"
              }`}
              style={{ willChange: "transform" }}
            >
              {hoverProject && !hoverProject.pending && (
                <div className="w-full h-full bg-charcoal ring-1 ring-cream/15 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] overflow-hidden">
                  <img
                    src={
                      hoverIsStorage
                        ? renderUrl(hoverProject.heroImage.src, { width: 480, quality: 70 })
                        : hoverProject.heroImage.src
                    }
                    alt=""
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Editorial preview — desktop only, sticks beside the index.
              Reflects the hovered project; defaults to Dunton when idle. */}
          <aside aria-hidden className="hidden lg:block lg:sticky lg:top-24">
            {(() => {
              const activeProject = hoverProject && !hoverProject.pending ? hoverProject : projects[0];
              if (!activeProject) return null;
              const heroSrc = activeProject.heroImage.src;
              const isStorage = heroSrc.includes("/storage/v1/object/public/");
              const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(heroSrc);
              const posterSrc = heroSrc.replace(/\.(mp4|webm|mov)(\?|$)/i, ".jpg$2");
              const displaySrc = isStorage && !isVideo
                ? renderUrl(heroSrc, { width: 900, quality: 72 })
                : heroSrc;
              return (
                <div className="relative w-full h-[calc(100vh-8rem)] overflow-hidden bg-charcoal ring-1 ring-cream/10">
                  {isVideo ? (
                    <video
                      key={heroSrc}
                      src={heroSrc}
                      poster={posterSrc}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      key={heroSrc}
                      src={displaySrc}
                      alt=""
                      draggable={false}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                  <div className="absolute inset-x-0 top-0 p-6 bg-gradient-to-b from-charcoal/70 to-transparent">
                    <p className="text-[10px] uppercase tracking-[0.32em] text-cream/70">
                      {hoverProject ? "In focus" : "In motion"}
                    </p>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-charcoal/85 to-transparent">
                    <p className="font-display text-2xl text-cream font-light">
                      {activeProject.title}
                    </p>
                    {activeProject.meta && (
                      <p className="mt-1 text-[10px] uppercase tracking-[0.32em] text-cream/55">
                        {activeProject.meta}
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}
          </aside>
        </div>

      </div>
    </section>
  );
}
