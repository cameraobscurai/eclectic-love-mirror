import { useEffect, useRef, useState } from "react";
import type { GalleryProject } from "@/content/gallery-projects";

// ---------------------------------------------------------------------------
// GalleryMasthead — editorial entry section.
//
// Five stacked zones inside one rounded panel (#0a0908):
//   1. Header        — display title + subtitle, filter pills
//   2. Wide cards    — horizontal row of project cards; active one widens
//   3. Filmstrip     — drawer with project thumbnails + "Open project"
//   4. Decorative map — fixed-position dots over a dark grid (no Mapbox)
//   5. Meta bar      — name · location/year · type + "Open project"
//
// activeIndex is owned here. Card click / map dot click → setActiveIndex(i)
// + jumpRef.current?.(i) to sync the card track below. The track's
// onActiveChange flows back via gallery.tsx into `activeIndex` (optional
// prop) which we mirror — no circular updates because we guard self-equal.
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
  /** Optional external active index (cards track / map). Mirrored locally. */
  activeIndex?: number;
}

// Approximate geographic positions (% of map container). Keyed by project
// number so reordering / filtering doesn't shuffle the map.
const MAP_POSITIONS: Record<string, { left: string; top: string; label: string }> = {
  "01": { left: "29%", top: "45%", label: "Utah" },
  "02": { left: "39%", top: "54%", label: "Aspen" },
  "03": { left: "41%", top: "57%", label: "Caribou Club" },
  "04": { left: "37%", top: "28%", label: "Big Sky" },
  "05": { left: "41%", top: "60%", label: "Dunton" },
  "06": { left: "19%", top: "60%", label: "California" },
};

// Warm the lightbox chunk on hover so opening feels instant.
let lightboxWarmed = false;
function warmLightbox() {
  if (lightboxWarmed) return;
  lightboxWarmed = true;
  void import("./GalleryLightbox");
}

export function GalleryMasthead({
  total,
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
  const [metaVisible, setMetaVisible] = useState(true);
  const [metaProject, setMetaProject] = useState<GalleryProject | undefined>(
    projects[0],
  );
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset to first card on filter / projects change.
  useEffect(() => {
    setActiveIndex(0);
    setMetaProject(projects[0]);
  }, [projects]);

  // Mirror external active (map / cards track) into local state.
  useEffect(() => {
    if (externalActiveIndex == null) return;
    if (externalActiveIndex === activeIndex) return;
    if (externalActiveIndex < 0 || externalActiveIndex >= projects.length) return;
    setActiveIndex(externalActiveIndex);
  }, [externalActiveIndex, activeIndex, projects.length]);

  // Crossfade meta bar on activeIndex change.
  useEffect(() => {
    if (!projects[activeIndex]) return;
    setMetaVisible(false);
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => {
      setMetaProject(projects[activeIndex]);
      setMetaVisible(true);
    }, 110);
    return () => {
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, [activeIndex, projects]);

  const handleSelect = (i: number) => {
    setActiveIndex(i);
    jumpRef.current?.(i);
  };

  const activeProject = projects[activeIndex];
  const drawerOpen = !!activeProject;

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
        style={{ background: "#0a0908" }}
      >
        {/* Zone 1 — Editorial header */}
        <div
          className="flex items-end justify-between gap-5"
          style={{
            padding: "clamp(28px,4vw,52px) 24px clamp(20px,3vw,36px)",
            borderBottom: "0.5px solid rgba(245,240,230,0.07)",
          }}
        >
          <div>
            <div
              className="font-display"
              style={{
                fontSize: "clamp(40px,7vw,80px)",
                fontWeight: 400,
                color: "rgba(245,240,230,0.92)",
                letterSpacing: "-0.015em",
                lineHeight: 1,
              }}
            >
              The Gallery
            </div>
            <div
              className="uppercase"
              style={{
                fontSize: 8,
                letterSpacing: "0.26em",
                color: "rgba(245,240,230,0.28)",
                marginTop: 7,
              }}
            >
              {String(total).padStart(2, "0")} Environments · Denver, Colorado
            </div>
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
                    fontSize: 8,
                    letterSpacing: "0.18em",
                    padding: "5px 11px",
                    border: on
                      ? "0.5px solid rgba(245,240,230,0.18)"
                      : "0.5px solid transparent",
                    background: on ? "rgba(245,240,230,0.05)" : "transparent",
                    color: on
                      ? "rgba(245,240,230,0.9)"
                      : "rgba(245,240,230,0.28)",
                  }}
                  onMouseEnter={(e) => {
                    if (!on)
                      e.currentTarget.style.color = "rgba(245,240,230,0.5)";
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

        {/* Zone 2 — Wide project cards */}
        <div style={{ padding: "16px 0 0" }}>
          <div
            className="uppercase"
            style={{
              fontSize: 7,
              letterSpacing: "0.26em",
              color: "rgba(245,240,230,0.18)",
              padding: "0 24px 10px",
            }}
          >
            Select a project
          </div>

          <div
            className="gallery-cards-row"
            style={{
              display: "flex",
              gap: 8,
              padding: "0 24px",
              overflowX: "auto",
              scrollbarWidth: "none",
            }}
          >
            {projects.map((p, i) => {
              const on = i === activeIndex;
              return (
                <button
                  key={p.number}
                  type="button"
                  onClick={() => handleSelect(i)}
                  onMouseEnter={warmLightbox}
                  aria-label={`View ${p.name}`}
                  aria-pressed={on}
                  className="gallery-wcard text-left cursor-pointer relative"
                  data-on={on ? "true" : "false"}
                  style={{
                    flexShrink: 0,
                    width: on ? 280 : 200,
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    transition:
                      "width 0.45s cubic-bezier(0.25,0.46,0.45,0.94)",
                  }}
                >
                  <div
                    className="relative overflow-hidden"
                    style={{
                      width: "100%",
                      height: 130,
                      borderRadius: 2,
                      background: "#141210",
                    }}
                  >
                    <img
                      src={p.heroImage.src}
                      alt={p.heroImage.alt}
                      loading={i === 0 ? "eager" : "lazy"}
                      className="gallery-wcard-img"
                      data-on={on ? "true" : "false"}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                    <div
                      className="absolute inset-0 pointer-events-none gallery-wcard-scrim"
                      data-on={on ? "true" : "false"}
                      style={{
                        background:
                          "linear-gradient(to top, rgba(10,8,5,0.7) 0%, transparent 50%)",
                      }}
                    />
                    <div
                      className="absolute uppercase pointer-events-none"
                      style={{
                        top: 7,
                        left: 9,
                        fontSize: 7,
                        letterSpacing: "0.2em",
                        color: on
                          ? "rgba(200,178,145,0.8)"
                          : "rgba(245,240,230,0.32)",
                        transition: "color 0.25s",
                      }}
                    >
                      {p.number}
                    </div>
                    <div
                      className="absolute left-0 right-0 pointer-events-none"
                      style={{
                        bottom: 0,
                        height: "1.5px",
                        background: on
                          ? "rgba(200,178,145,0.7)"
                          : "rgba(200,178,145,0)",
                        transition: "background 0.3s",
                      }}
                    />
                  </div>

                  <div
                    className="flex items-baseline justify-between gap-2"
                    style={{ paddingTop: 6 }}
                  >
                    <div
                      className="gallery-wcard-name"
                      data-on={on ? "true" : "false"}
                      style={{
                        fontSize: 10,
                        fontWeight: 300,
                        fontFamily: "Georgia, serif",
                        color: on
                          ? "rgba(245,240,230,0.9)"
                          : "rgba(245,240,230,0.5)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        transition: "color 0.25s",
                      }}
                    >
                      {p.name}
                    </div>
                    <div
                      className="uppercase shrink-0 whitespace-nowrap"
                      style={{
                        fontSize: 7,
                        letterSpacing: "0.12em",
                        color: "rgba(245,240,230,0.22)",
                      }}
                    >
                      {p.region}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Zone 3 — Filmstrip drawer */}
        <div
          style={{
            margin: "12px 24px 0",
            overflow: "hidden",
            maxHeight: drawerOpen ? 120 : 0,
            opacity: drawerOpen ? 1 : 0,
            transition:
              "max-height 0.45s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.35s ease",
          }}
        >
          {activeProject && (
            <>
              <div
                className="uppercase"
                style={{
                  fontSize: 7,
                  letterSpacing: "0.16em",
                  color: "rgba(245,240,230,0.22)",
                  marginBottom: 6,
                }}
              >
                {activeProject.name} · {activeProject.detailImages.length} images
              </div>
              <div className="flex items-center">
                <div
                  className="gallery-drawer-strip"
                  style={{
                    display: "flex",
                    gap: 4,
                    overflowX: "auto",
                    scrollbarWidth: "none",
                    paddingBottom: 2,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {activeProject.detailImages.map((img, j) => (
                    <button
                      key={j}
                      type="button"
                      onClick={() => onOpen(activeIndex)}
                      onMouseEnter={warmLightbox}
                      className="gallery-dthumb shrink-0 cursor-pointer overflow-hidden"
                      aria-label={`Open ${activeProject.name} — image ${j + 1}`}
                      style={{
                        width: 88,
                        height: 58,
                        borderRadius: 2,
                        border: "0.5px solid transparent",
                        background: "#141210",
                        padding: 0,
                        transition:
                          "border-color 0.2s, opacity 0.2s",
                      }}
                    >
                      <img
                        src={img.src}
                        alt={img.alt}
                        loading="lazy"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                          opacity: 0.65,
                          transition:
                            "transform 0.5s ease, opacity 0.3s",
                        }}
                      />
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => onOpen(activeIndex)}
                  className="uppercase whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                  style={{
                    fontSize: 7,
                    letterSpacing: "0.2em",
                    color: "rgba(200,178,145,0.6)",
                    borderBottom: "0.5px solid rgba(200,178,145,0.3)",
                    paddingBottom: 1,
                    marginLeft: 8,
                    alignSelf: "center",
                    background: "transparent",
                    border: "none",
                    borderBottomStyle: "solid",
                    borderBottomWidth: "0.5px",
                    borderBottomColor: "rgba(200,178,145,0.3)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "rgba(200,178,145,1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "rgba(200,178,145,0.6)";
                  }}
                >
                  Open project →
                </button>
              </div>
            </>
          )}
        </div>

        {/* Zone 4 — Decorative map */}
        <div
          className="relative overflow-hidden"
          style={{
            margin: "14px 24px",
            border: "0.5px solid rgba(245,240,230,0.07)",
            borderRadius: 4,
            height: 110,
            background: "#0e0d0b",
          }}
          aria-hidden="true"
        >
          <div
            className="absolute uppercase"
            style={{
              top: 9,
              left: 12,
              fontSize: 7,
              letterSpacing: "0.22em",
              color: "rgba(245,240,230,0.32)",
              zIndex: 2,
            }}
          >
            Where we&rsquo;ve built
          </div>
          <div
            className="absolute uppercase"
            style={{
              top: 9,
              right: 12,
              fontSize: 7,
              letterSpacing: "0.2em",
              color: "rgba(245,240,230,0.2)",
              zIndex: 2,
            }}
          >
            {String(projects.length).padStart(2, "0")} locations
          </div>

          {/* Grid texture */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              opacity: 0.04,
              backgroundImage:
                "linear-gradient(rgba(245,240,230,1) 1px, transparent 1px), linear-gradient(90deg, rgba(245,240,230,1) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

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
                    width: 0,
                    height: 0,
                    background: "transparent",
                    border: "none",
                    padding: 0,
                  }}
                >
                  <span
                    className="gallery-mdot-pulse"
                    data-on={on ? "true" : "false"}
                    style={{
                      position: "absolute",
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "rgba(200,178,145,0.4)",
                      left: 0,
                      top: 0,
                      pointerEvents: "none",
                    }}
                  />
                  <span
                    className="gallery-mdot-ring"
                    data-on={on ? "true" : "false"}
                    style={{
                      position: "absolute",
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: on
                        ? "rgba(200,178,145,1)"
                        : "rgba(200,178,145,0.65)",
                      border: "1px solid rgba(200,178,145,0.3)",
                      transform: on
                        ? "translate(-50%,-50%) scale(1.5)"
                        : "translate(-50%,-50%)",
                      transition: "all 0.3s",
                      left: 0,
                      top: 0,
                    }}
                  />
                  <span
                    className="uppercase pointer-events-none whitespace-nowrap"
                    style={{
                      position: "absolute",
                      top: -14,
                      left: 0,
                      transform: "translateX(-50%)",
                      fontSize: 6,
                      letterSpacing: "0.1em",
                      color: on
                        ? "rgba(200,178,145,0.85)"
                        : "rgba(245,240,230,0.35)",
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

        {/* Zone 5 — Meta bar */}
        <div
          className="grid items-center"
          style={{
            padding: "11px 24px",
            gridTemplateColumns: "1fr auto 1fr",
            gap: 12,
            borderTop: "0.5px solid rgba(245,240,230,0.07)",
            opacity: metaVisible ? 1 : 0,
            transform: metaVisible ? "translateY(0)" : "translateY(3px)",
            transition: "opacity 0.22s ease, transform 0.22s ease",
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 300,
              color: "rgba(245,240,230,0.88)",
              fontFamily: "Georgia, serif",
              letterSpacing: "-0.01em",
            }}
          >
            {metaProject?.name ?? ""}
          </div>
          <div
            className="uppercase text-center whitespace-nowrap"
            style={{
              fontSize: 7,
              letterSpacing: "0.18em",
              color: "rgba(245,240,230,0.25)",
            }}
          >
            {metaProject ? `${metaProject.location} · ${metaProject.year}` : ""}
          </div>
          <div className="flex items-center justify-end" style={{ gap: 12 }}>
            <div
              className="uppercase whitespace-nowrap"
              style={{
                fontSize: 7,
                letterSpacing: "0.16em",
                color: "rgba(245,240,230,0.2)",
              }}
            >
              {metaProject?.kind ?? ""}
            </div>
            <button
              type="button"
              onClick={() => onOpen(activeIndex)}
              className="uppercase whitespace-nowrap cursor-pointer transition-colors"
              style={{
                fontSize: 7,
                letterSpacing: "0.2em",
                color: "rgba(200,178,145,0.6)",
                borderBottom: "0.5px solid rgba(200,178,145,0.3)",
                paddingBottom: 1,
                background: "transparent",
                border: "none",
                borderBottomStyle: "solid",
                borderBottomWidth: "0.5px",
                borderBottomColor: "rgba(200,178,145,0.3)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "rgba(200,178,145,1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(200,178,145,0.6)";
              }}
            >
              Open project →
            </button>
          </div>
        </div>

        <style>{`
          .gallery-cards-row::-webkit-scrollbar,
          .gallery-drawer-strip::-webkit-scrollbar { display: none; }

          .gallery-wcard-img {
            opacity: 0.6;
            transform: scale(1.02);
            transition: transform 0.65s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.35s ease;
          }
          .gallery-wcard-img[data-on="true"] {
            opacity: 1;
            transform: scale(1);
          }
          .gallery-wcard:hover .gallery-wcard-img[data-on="false"] {
            opacity: 0.82;
            transform: scale(1.04);
          }
          .gallery-wcard-scrim { opacity: 0; transition: opacity 0.3s; }
          .gallery-wcard:hover .gallery-wcard-scrim,
          .gallery-wcard-scrim[data-on="true"] { opacity: 1; }

          .gallery-wcard:hover .gallery-wcard-name[data-on="false"] {
            color: rgba(245,240,230,0.9) !important;
          }

          .gallery-dthumb:hover { border-color: rgba(200,178,145,0.35) !important; }
          .gallery-dthumb:hover img { transform: scale(1.06); opacity: 1; }

          @keyframes gallery-mdot-pulse {
            0% { transform: translate(-50%,-50%) scale(1); opacity: 0.5; }
            100% { transform: translate(-50%,-50%) scale(3.5); opacity: 0; }
          }
          .gallery-mdot-pulse {
            transform: translate(-50%,-50%) scale(1);
            animation: none;
          }
          .gallery-mdot-pulse[data-on="true"] {
            animation: gallery-mdot-pulse 1.8s ease-out infinite;
          }

          @media (prefers-reduced-motion: reduce) {
            .gallery-mdot-pulse[data-on="true"] { animation: none; }
            .gallery-wcard-img { transition: none; }
          }
        `}</style>
      </div>
    </section>
  );
}
