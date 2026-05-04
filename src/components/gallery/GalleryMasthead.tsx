import { useEffect, useRef, useState } from "react";
import type { GalleryProject } from "@/content/gallery-projects";

// ---------------------------------------------------------------------------
// GalleryMasthead — compact editorial masthead.
//
// Five zones (Zone 1 = global nav, lives in __root):
//   2. Gallery bar    — "The Gallery" label + filter pills (utility row)
//   3. Thumbnail strip — flex row of project thumbs, click/hover sets active
//   4. Depth card     — stacked absolute cards, only active is visible
//   5. Decorative map — fixed CSS dots over a tiny dark grid (no Mapbox)
//
// activeIndex is owned here. Thumbnail / map dot / card click → setActiveIndex
// + jumpRef.current?.(i) to sync the cards track below the masthead.
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
  activeIndex?: number;
}

// Hardcoded geographic positions (% of map container). Decorative.
const MAP_POSITIONS: Record<string, { left: string; top: string; label: string }> = {
  "01": { left: "29%", top: "48%", label: "Utah" },
  "02": { left: "39%", top: "57%", label: "Aspen" },
  "03": { left: "41%", top: "62%", label: "Caribou" },
  "04": { left: "37%", top: "28%", label: "Montana" },
  "05": { left: "41%", top: "68%", label: "Dunton" },
  "06": { left: "19%", top: "62%", label: "California" },
};

// Hardcoded curved connector paths (viewBox 0 0 100 100, non-uniform).
const MAP_CONNECTORS = [
  "M 19 62 Q 24 55 29 48",
  "M 29 48 Q 33 38 37 28",
  "M 29 48 Q 34 53 39 57",
  "M 39 57 Q 40 60 41 62",
  "M 41 62 Q 41 65 41 68",
];

let lightboxWarmed = false;
function warmLightbox() {
  if (lightboxWarmed) return;
  lightboxWarmed = true;
  void import("./GalleryLightbox");
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
  const stripRef = useRef<HTMLDivElement | null>(null);

  // Wheel handler: consume horizontal scroll while the strip has room, then
  // release at boundaries so the page resumes vertical scroll. passive:false
  // is required to call preventDefault() on the wheel event.
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta === 0) return;
      const atLeft = el.scrollLeft <= 0;
      const atRight = el.scrollLeft >= max - 1;
      if ((atLeft && delta < 0) || (atRight && delta > 0)) return; // release
      e.preventDefault();
      el.scrollLeft += delta;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);


  // Reset to first card when projects ref changes (filter swap).
  useEffect(() => {
    setActiveIndex(0);
  }, [projects]);

  // Mirror external active index from cards track / map sync.
  useEffect(() => {
    if (externalActiveIndex == null) return;
    if (externalActiveIndex === activeIndex) return;
    if (externalActiveIndex < 0 || externalActiveIndex >= projects.length) return;
    setActiveIndex(externalActiveIndex);
  }, [externalActiveIndex, activeIndex, projects.length]);

  const handleSelect = (i: number) => {
    setActiveIndex(i);
    jumpRef.current?.(i);
  };

  return (
    <section
      aria-labelledby="gallery-heading"
      className="px-6 lg:px-12 pt-2 pb-8"
    >
      <h1 id="gallery-heading" className="sr-only">
        The Gallery
      </h1>

      <div
        className="max-w-[1600px] mx-auto overflow-hidden rounded-md select-none"
        style={{ background: "#0a0908" }}
      >
        {/* Zone 2 — Gallery bar */}
        <div
          className="flex items-center justify-between gap-4"
          style={{
            padding: "10px 24px",
            borderBottom: "0.5px solid rgba(245,240,230,0.07)",
          }}
        >
          <div
            className="uppercase"
            style={{
              fontSize: 8,
              letterSpacing: "0.28em",
              color: "rgba(245,240,230,0.28)",
              lineHeight: 1.4,
            }}
          >
            The Gallery
          </div>
          <div className="flex flex-wrap gap-[2px] justify-end shrink-0">
            {filters.map((f) => {
              const on = f === active;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => onChange(f)}
                  className="uppercase cursor-pointer transition-colors"
                  style={{
                    fontSize: 7,
                    letterSpacing: "0.18em",
                    padding: "4px 9px",
                    border: on
                      ? "0.5px solid rgba(245,240,230,0.18)"
                      : "0.5px solid transparent",
                    background: on ? "rgba(245,240,230,0.05)" : "transparent",
                    color: on
                      ? "rgba(245,240,230,0.88)"
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
                  <span style={{ opacity: 0.6 }}>
                    {String(counts[f] ?? 0).padStart(2, "0")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Zone 3 — Thumbnail strip */}
        <div
          style={{
            padding: "12px 24px 10px",
            borderBottom: "0.5px solid rgba(245,240,230,0.07)",
          }}
        >
          <div
            className="uppercase"
            style={{
              fontSize: 6,
              letterSpacing: "0.24em",
              color: "rgba(245,240,230,0.18)",
              marginBottom: 8,
            }}
          >
            {String(projects.length).padStart(2, "0")} environments — hover to preview · click to explore
          </div>
          <div
            ref={stripRef}
            className="gallery-strip"
            style={{
              display: "flex",
              gap: 3,
              overflowX: "auto",
              overscrollBehaviorX: "contain",
              scrollBehavior: "smooth",
              touchAction: "pan-x",
              scrollbarWidth: "none",
            }}
          >
            {projects.map((p, i) => {
              const on = i === activeIndex;
              return (
                <div
                  key={p.number}
                  style={{ flex: "1 0 14%", minWidth: 140 }}
                >
                  <button
                    type="button"
                    onMouseEnter={() => {
                      setActiveIndex(i);
                      warmLightbox();
                    }}
                    onClick={() => handleSelect(i)}
                    aria-label={`Preview ${p.name}`}
                    aria-pressed={on}
                    className="gallery-thumb cursor-pointer block w-full"
                    data-on={on ? "true" : "false"}
                    style={{
                      position: "relative",
                      aspectRatio: "3 / 2",
                      overflow: "hidden",
                      borderRadius: 1,
                      background: "#141210",
                      border: "none",
                      padding: 0,
                    }}
                  >
                    <img
                      src={p.heroImage.src}
                      alt={p.heroImage.alt}
                      loading={i === 0 ? "eager" : "lazy"}
                      className="gallery-thumb-img"
                      data-on={on ? "true" : "false"}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                    <div
                      className="absolute uppercase pointer-events-none"
                      style={{
                        top: 4,
                        left: 5,
                        fontSize: 6,
                        letterSpacing: "0.16em",
                        color: on
                          ? "rgba(200,178,145,0.8)"
                          : "rgba(245,240,230,0.32)",
                        transition: "color 0.25s",
                      }}
                    >
                      {p.number}
                    </div>
                  </button>
                  <div
                    style={{
                      marginTop: 3,
                      height: "1.5px",
                      background: on
                        ? "rgba(200,178,145,0.7)"
                        : "rgba(200,178,145,0)",
                      transition: "background 0.25s",
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Zone 4 — Depth card stack */}
        <div style={{ position: "relative" }}>
          {projects.map((p, i) => {
            const on = i === activeIndex;
            return (
              <div
                key={p.number}
                aria-hidden={on ? undefined : true}
                style={{
                  position: on ? "relative" : "absolute",
                  inset: on ? undefined : 0,
                  top: on ? undefined : 0,
                  left: on ? undefined : 0,
                  right: on ? undefined : 0,
                  opacity: on ? 1 : 0,
                  pointerEvents: on ? "auto" : "none",
                  transition: "opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                {/* Image area removed — thumbnail strip above is the only hero. */}

                {/* Meta bar */}
                <div
                  className="grid items-baseline"
                  style={{
                    padding: "11px 24px 13px",
                    gridTemplateColumns: "1fr auto 1fr",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 18,
                      fontFamily: "Georgia, serif",
                      fontWeight: 300,
                      letterSpacing: "-0.01em",
                      color: "rgba(245,240,230,0.9)",
                    }}
                  >
                    {p.name}
                  </div>
                  <div
                    className="uppercase text-center whitespace-nowrap"
                    style={{
                      fontSize: 7,
                      letterSpacing: "0.16em",
                      color: "rgba(245,240,230,0.25)",
                    }}
                  >
                    {p.location} · {p.year}
                  </div>
                  <div
                    className="flex items-baseline justify-end"
                    style={{ gap: 10 }}
                  >
                    <div
                      className="uppercase whitespace-nowrap"
                      style={{
                        fontSize: 7,
                        letterSpacing: "0.16em",
                        color: "rgba(245,240,230,0.2)",
                      }}
                    >
                      {p.kind}
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpen(activeIndex)}
                      className="gallery-depth-meta-open uppercase whitespace-nowrap cursor-pointer"
                      style={{
                        fontSize: 7,
                        letterSpacing: "0.18em",
                        color: "rgba(200,178,145,0.6)",
                        borderBottom: "0.5px solid rgba(200,178,145,0.3)",
                        paddingBottom: 1,
                        background: "transparent",
                        border: "none",
                        borderBottomStyle: "solid",
                        borderBottomWidth: "0.5px",
                        borderBottomColor: "rgba(200,178,145,0.3)",
                        transition: "color 0.2s",
                      }}
                    >
                      Open →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Zone 5 — Decorative map */}
        <div
          className="relative overflow-hidden"
          style={{
            margin: "0 24px 12px",
            border: "0.5px solid rgba(245,240,230,0.07)",
            borderRadius: 4,
            height: 100,
            background: "#0d0c0a",
          }}
        >
          <div
            className="absolute uppercase pointer-events-none"
            style={{
              top: 8,
              left: 12,
              fontSize: 7,
              letterSpacing: "0.2em",
              color: "rgba(245,240,230,0.28)",
              zIndex: 2,
            }}
          >
            Where we&rsquo;ve built
          </div>
          <div
            className="absolute uppercase pointer-events-none"
            style={{
              top: 8,
              right: 12,
              fontSize: 7,
              letterSpacing: "0.2em",
              color: "rgba(245,240,230,0.18)",
              zIndex: 2,
            }}
          >
            {String(projects.length).padStart(2, "0")} locations
          </div>

          {/* Grid texture */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              opacity: 0.03,
              backgroundImage:
                "linear-gradient(rgba(245,240,230,1) 1px, transparent 1px), linear-gradient(90deg, rgba(245,240,230,1) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          {/* Connector lines */}
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: "100%", height: "100%" }}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {MAP_CONNECTORS.map((d, i) => (
              <path
                key={i}
                d={d}
                stroke="rgba(200,178,145,0.08)"
                strokeWidth={0.3}
                fill="none"
              />
            ))}
          </svg>

          {/* Dots */}
          <div className="absolute inset-0">
            {projects.map((p, i) => {
              const pos = MAP_POSITIONS[p.number];
              if (!pos) return null;
              const on = i === activeIndex;
              return (
                <button
                  key={p.number}
                  type="button"
                  onClick={() => handleSelect(i)}
                  className="gallery-mdot absolute cursor-pointer"
                  data-on={on ? "true" : "false"}
                  aria-label={`Show ${p.name}`}
                  style={{
                    left: pos.left,
                    top: pos.top,
                    transform: "translate(-50%, -50%)",
                    width: 14,
                    height: 14,
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    zIndex: 3,
                  }}
                >
                  <span
                    className="gallery-mdot-pulse"
                    data-on={on ? "true" : "false"}
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "rgba(200,178,145,0.6)",
                      pointerEvents: "none",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      transform: "translate(-50%,-50%)",
                      background: on
                        ? "rgba(200,178,145,1)"
                        : "rgba(200,178,145,0.5)",
                      boxShadow: on
                        ? "0 0 0 3px rgba(200,178,145,0.12)"
                        : "none",
                      transition: "background 0.25s, box-shadow 0.25s",
                    }}
                  />
                  <span
                    className="gallery-mdot-label uppercase pointer-events-none whitespace-nowrap"
                    data-on={on ? "true" : "false"}
                    style={{
                      position: "absolute",
                      top: -14,
                      left: "50%",
                      transform: "translateX(-50%)",
                      fontSize: 6,
                      letterSpacing: "0.1em",
                      color: on
                        ? "rgba(200,178,145,0.75)"
                        : "rgba(245,240,230,0)",
                      transition: "color 0.2s",
                    }}
                  >
                    {pos.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <style>{`
          .gallery-thumb-img {
            opacity: 0.45;
            transform: scale(1.02);
            transition: opacity 0.3s ease, transform 0.5s ease;
          }
          .gallery-thumb-img[data-on="true"],
          .gallery-thumb:hover .gallery-thumb-img {
            opacity: 0.92;
            transform: scale(1);
          }

          .gallery-depth-img {
            transition: transform 0.8s cubic-bezier(0.25,0.46,0.45,0.94);
          }
          .gallery-depth-img-wrap:hover .gallery-depth-img {
            transform: scale(1.03);
          }
          .gallery-depth-img-wrap:hover .gallery-depth-open {
            opacity: 1 !important;
            transform: translateY(0) !important;
          }

          .gallery-depth-meta-open:hover {
            color: rgba(200,178,145,1) !important;
          }

          .gallery-mdot:hover .gallery-mdot-label {
            color: rgba(245,240,230,0.45);
          }
          .gallery-mdot-label[data-on="true"] {
            color: rgba(200,178,145,0.75) !important;
          }

          @keyframes gallery-mdot-pulse {
            0% { transform: translate(-50%,-50%) scale(1); opacity: 0.5; }
            100% { transform: translate(-50%,-50%) scale(3.5); opacity: 0; }
          }
          .gallery-mdot-pulse {
            transform: translate(-50%,-50%) scale(1);
            opacity: 0;
          }
          .gallery-mdot-pulse[data-on="true"] {
            animation: gallery-mdot-pulse 1.8s ease-out infinite;
          }

          @media (prefers-reduced-motion: reduce) {
            .gallery-mdot-pulse[data-on="true"] { animation: none; }
            .gallery-thumb-img,
            .gallery-depth-img { transition: none; }
          }
        `}</style>
      </div>
    </section>
  );
}
