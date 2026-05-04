import { useEffect, useRef, useState } from "react";
import type { GalleryProject } from "@/content/gallery-projects";

// ---------------------------------------------------------------------------
// GalleryMasthead — dark editorial entry section.
//
// Four stacked zones, no gaps, separated only by 0.5px hairlines:
//   1. Top bar      — wordmark + compact filter pills
//   2. Project grid — N-up 2/3 cards, active warmed in amber
//   3. Meta row     — name · location/year · type + "Open project →"
//   4. Mood strip   — infinite drifting tile reel
//
// activeIndex is owned here. Card click → setActiveIndex + jumpRef.current(i)
// to sync the card track. The track's onActiveChange flows back up through
// gallery.tsx to feed the index/map; the masthead does NOT consume that
// signal, so there are no circular updates.
// ---------------------------------------------------------------------------

export type CategoryFilter = string;

export interface GalleryMastheadProps {
  total: number;
  visibleCount: number;
  active: CategoryFilter;
  counts: Record<CategoryFilter, number>;
  onChange: (next: CategoryFilter) => void;
  filters: CategoryFilter[];
  projects: GalleryProject[];
  onOpen: (index: number) => void;
  jumpRef: React.MutableRefObject<((index: number) => void) | null>;
  /**
   * Externally-driven active index (e.g. from map dot clicks or card track
   * scroll). When provided, the masthead mirrors it into local state so the
   * grid highlight + meta row stay in sync with the rest of the page.
   */
  activeIndex?: number;
}

export function GalleryMasthead({
  active,
  counts,
  onChange,
  filters,
  projects,
  onOpen,
  jumpRef,
  activeIndex: externalActiveIndex,
}: GalleryMastheadProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Mirror external active index (map / cards track) into local state.
  useEffect(() => {
    if (externalActiveIndex == null) return;
    if (externalActiveIndex === activeIndex) return;
    if (externalActiveIndex < 0 || externalActiveIndex >= projects.length) return;
    setActiveIndex(externalActiveIndex);
  }, [externalActiveIndex, activeIndex, projects.length]);
  const [metaVisible, setMetaVisible] = useState(true);
  const [metaProject, setMetaProject] = useState<GalleryProject | undefined>(
    projects[0],
  );
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter swap → reset to first card.
  useEffect(() => {
    setActiveIndex(0);
    setMetaProject(projects[0]);
  }, [projects]);

  // Crossfade the meta row when active changes.
  useEffect(() => {
    if (!projects[activeIndex]) return;
    setMetaVisible(false);
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => {
      setMetaProject(projects[activeIndex]);
      setMetaVisible(true);
    }, 130);
    return () => {
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, [activeIndex, projects]);

  const handleCardClick = (i: number) => {
    setActiveIndex(i);
    jumpRef.current?.(i);
  };

  return (
    <section
      aria-labelledby="gallery-heading"
      className="px-6 lg:px-12 pt-6 pb-10"
    >
      <h1 id="gallery-heading" className="sr-only">
        The Gallery
      </h1>

      <div
        className="max-w-[1600px] mx-auto overflow-hidden rounded-xl select-none"
        style={{ background: "#0e0d0b" }}
      >
        {/* Zone 1 — top bar */}
        <div
          className="flex items-center justify-between gap-4 px-5 pt-4 pb-3.5"
          style={{ borderBottom: "0.5px solid rgba(245,240,230,0.06)" }}
        >
          <div
            className="text-[9px] uppercase"
            style={{ letterSpacing: "0.3em", color: "rgba(245,240,230,0.4)" }}
          >
            The Gallery
          </div>
          <div className="flex flex-wrap gap-[2px] justify-end">
            {filters.map((f) => {
              const on = f === active;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => onChange(f)}
                  className="text-[8px] uppercase transition-colors cursor-pointer"
                  style={{
                    letterSpacing: "0.2em",
                    padding: "5px 10px",
                    border: on
                      ? "0.5px solid rgba(245,240,230,0.2)"
                      : "0.5px solid transparent",
                    background: on ? "rgba(245,240,230,0.05)" : "transparent",
                    color: on
                      ? "rgba(245,240,230,0.9)"
                      : "rgba(245,240,230,0.28)",
                  }}
                  onMouseEnter={(e) => {
                    if (!on)
                      e.currentTarget.style.color = "rgba(245,240,230,0.55)";
                  }}
                  onMouseLeave={(e) => {
                    if (!on)
                      e.currentTarget.style.color = "rgba(245,240,230,0.28)";
                  }}
                >
                  {f}{" "}
                  <span style={{ opacity: 0.5 }}>
                    {String(counts[f] ?? 0).padStart(2, "0")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Zone 2 — project grid */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${Math.max(1, projects.length)}, 1fr)`,
            gap: "1px",
            background: "rgba(245,240,230,0.04)",
          }}
        >
          {projects.map((p, i) => {
            const on = i === activeIndex;
            return (
              <button
                key={p.number}
                type="button"
                onClick={() => handleCardClick(i)}
                aria-label={`View ${p.name}`}
                aria-pressed={on}
                className="group relative overflow-hidden cursor-pointer"
                style={{ aspectRatio: "2/3", background: "#0e0d0b" }}
              >
                <img
                  src={p.heroImage.src}
                  alt={p.heroImage.alt}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover gallery-grid-img"
                  data-on={on ? "true" : "false"}
                />
                {/* Veil */}
                <div
                  className="absolute inset-0 transition-opacity duration-300 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(10,8,5,0.5) 0%, transparent 50%)",
                    opacity: on ? 1 : 0,
                  }}
                />
                {/* Number */}
                <div
                  className="absolute z-[2] text-[7px] uppercase transition-colors duration-300 pointer-events-none"
                  style={{
                    top: 8,
                    left: 9,
                    letterSpacing: "0.2em",
                    color: on
                      ? "rgba(200,178,145,0.85)"
                      : "rgba(245,240,230,0.35)",
                  }}
                >
                  {p.number}
                </div>
                {/* Bottom tick */}
                <div
                  className="absolute left-0 right-0 bottom-0 pointer-events-none"
                  style={{
                    height: "1.5px",
                    background: on
                      ? "rgba(200,178,145,0.7)"
                      : "rgba(200,178,145,0)",
                    transition: "background 0.35s ease",
                  }}
                />
              </button>
            );
          })}
        </div>

        {/* Zone 3 — meta row */}
        <div
          className="grid items-baseline gap-3 px-5 pt-3 pb-3.5"
          style={{
            gridTemplateColumns: "1fr auto 1fr",
            minHeight: 48,
            borderTop: "0.5px solid rgba(245,240,230,0.06)",
            borderBottom: "0.5px solid rgba(245,240,230,0.06)",
            opacity: metaVisible ? 1 : 0,
            transform: metaVisible ? "translateY(0)" : "translateY(4px)",
            transition: "opacity 0.25s ease, transform 0.25s ease",
          }}
        >
          <div
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 18,
              fontWeight: 300,
              color: "rgba(245,240,230,0.9)",
              letterSpacing: "-0.01em",
            }}
          >
            {metaProject?.name ?? ""}
          </div>
          <div
            className="uppercase text-center whitespace-nowrap"
            style={{
              fontSize: 8,
              letterSpacing: "0.18em",
              color: "rgba(245,240,230,0.3)",
            }}
          >
            {metaProject ? `${metaProject.location} · ${metaProject.year}` : ""}
          </div>
          <div className="flex justify-end items-baseline gap-4">
            <div
              className="uppercase whitespace-nowrap"
              style={{
                fontSize: 8,
                letterSpacing: "0.18em",
                color: "rgba(245,240,230,0.25)",
                textAlign: "right",
              }}
            >
              {metaProject?.kind ?? ""}
            </div>
            <button
              type="button"
              onClick={() => onOpen(activeIndex)}
              className="uppercase whitespace-nowrap transition-colors cursor-pointer"
              style={{
                fontSize: 8,
                letterSpacing: "0.2em",
                color: "rgba(200,178,145,0.6)",
                borderBottom: "0.5px solid rgba(200,178,145,0.3)",
                paddingBottom: 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "rgba(200,178,145,0.9)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(200,178,145,0.6)";
              }}
            >
              Open project →
            </button>
          </div>
        </div>

        {/* Zone 4 — mood strip */}
        <div className="overflow-hidden gallery-mood">
          <div
            className="gallery-mood-track flex"
            style={{ width: "max-content" }}
          >
            {[...projects, ...projects].map((p, i) => (
              <div
                key={`${p.number}-${i}`}
                className="flex-shrink-0 overflow-hidden"
                style={{
                  width: 100,
                  height: 120,
                  borderRight: "1px solid #0e0d0b",
                }}
              >
                <img
                  src={p.heroImage.src}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover block gallery-mood-img"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Watermark */}
        <div
          className="text-center"
          style={{
            padding: "10px 0 12px",
            fontSize: 8,
            letterSpacing: "0.38em",
            textTransform: "uppercase",
            color: "rgba(245,240,230,0.18)",
          }}
        >
          E C L E C T I C &nbsp; H I V E
        </div>

        <style>{`
          .gallery-grid-img {
            opacity: 0.5;
            transform: scale(1.02);
            transition: transform 0.8s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.4s ease;
          }
          .gallery-grid-img[data-on="true"] {
            opacity: 1;
            transform: scale(1.0);
          }
          .group:hover .gallery-grid-img[data-on="false"] {
            opacity: 0.78;
            transform: scale(1.04);
          }
          .group:hover .gallery-grid-img[data-on="true"] {
            opacity: 1;
            transform: scale(1.02);
          }
          @keyframes gallery-mood-drift {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .gallery-mood-track {
            animation: gallery-mood-drift 32s linear infinite;
          }
          .gallery-mood:hover .gallery-mood-track {
            animation-play-state: paused;
          }
          .gallery-mood-img {
            transition: transform 8s ease;
          }
          .gallery-mood-img:hover {
            transform: scale(1.06);
          }
          @media (prefers-reduced-motion: reduce) {
            .gallery-mood-track { animation: none; }
            .gallery-grid-img { transition: none; }
          }
        `}</style>
      </div>
    </section>
  );
}
