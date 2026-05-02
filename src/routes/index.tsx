import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LiquidGlass } from "@/components/liquid-glass";
import { cn } from "@/lib/utils";
// Home is intentionally empty of imagery — the four apertures below define
// the layout contract. Real photography drops in once the composition is
// approved. See `HomeAperture` below for the dark-variant frame language
// (mirrors `MediaAperture` used on Atelier and Gallery).


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ECLECTIC HIVE — Luxury Event Design & Production | Denver" },
      {
        name: "description",
        content:
          "Two parts luxe, one part regal, and a dash of edge. Full-service luxury event design, custom fabrication, and furniture rentals in Denver, Colorado.",
      },
      { property: "og:title", content: "ECLECTIC HIVE — Luxury Event Design & Production" },
      {
        property: "og:description",
        content:
          "Cinematic, art-forward environments for weddings, galas, and corporate events.",
      },
    ],
  }),
  component: HomePage,
});

const DESTINATIONS = [
  { href: "/atelier", label: "Design + Fabrication", title: "Atelier" },
  { href: "/collection", label: "Signature Inventory", title: "Collection" },
  { href: "/gallery", label: "Selected Work", title: "Gallery" },
] as const;

function HomePage() {
  const [loaded, setLoaded] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  // No scroll-driven parallax: the page is locked to one viewport with no
  // imagery. The parallax effect was tied to the hero photo and is no longer
  // meaningful here.

  return (
    <main
      id="main-content"
      className="bg-charcoal lg:overflow-hidden"
      style={{
        // Desktop: clamp the front door to one viewport, no scroll possible.
        // Mobile keeps natural height so it can scroll if the device is short.
        overscrollBehavior: "none",
      }}
    >
      <section
        className="relative flex flex-col overflow-hidden"
        style={{
          height: "100dvh",
          minHeight: "100dvh",
          maxHeight: "100dvh",
        }}
      >
        {/*
          Editorial asymmetric grid (Layout A) — empty frames only.
            - left column (40%) = tall texture anchor
            - right column (60%) split:
                * top 60% = wide environment hero
                * bottom 40% = two object-detail vignettes
          Hairline gaps in charcoal so the page reads as four mounted apertures
          behind the wordmark + CTA bar. No imagery until the composition is
          approved. Mobile collapses to a single full-bleed aperture.
        */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 hidden md:grid grid-cols-[40fr_60fr] gap-[2px] bg-charcoal">
            <HomeAperture label="LEFT · TEXTURE" />
            <div className="grid grid-rows-[60fr_40fr] gap-[2px] bg-charcoal">
              <HomeAperture label="TOP · ENVIRONMENT" />
              <div className="grid grid-cols-2 gap-[2px] bg-charcoal">
                <HomeAperture label="DETAIL · ONE" />
                <HomeAperture label="DETAIL · TWO" />
              </div>
            </div>
          </div>

          {/* Mobile — single aperture so the front door stays calm. */}
          <div className="md:hidden absolute inset-0">
            <HomeAperture label="HERO" />
          </div>
        </div>

        <div className="absolute inset-0 bg-charcoal/[0.02]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_80%_at_center,transparent_40%,rgba(20,20,20,0.3)_100%)]" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, transparent 0%, transparent 75%, rgba(28,26,24,0.35) 88%, rgba(28,26,24,0.6) 100%)",
          }}
        />

        <div className="relative z-10 flex-1 flex items-center justify-center pb-[22vh] md:pb-[20vh]">
          <h1
            className="font-brand text-[clamp(2.4rem,8.5vw,7rem)] tracking-[0.12em] text-cream uppercase drop-shadow-[0_4px_40px_rgba(0,0,0,0.25)]"
            style={{ fontWeight: 400 }}
          >
            {"ECLECTIC HIVE".split("").map((char, i) => (
              <span
                key={i}
                className={cn(
                  "inline-block transition-all duration-700",
                  loaded ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
                )}
                style={{ transitionDelay: `${250 + i * 30}ms` }}
              >
                {char === " " ? "\u00A0" : char}
              </span>
            ))}
          </h1>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-5 md:px-8 md:pb-8">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
              {DESTINATIONS.map((dest, i) => (
                <Link
                  key={dest.href}
                  to={dest.href}
                  aria-label={`${dest.title} — ${dest.label}`}
                  className={cn(
                    "group transition-all duration-700",
                    loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                  )}
                  style={{ transitionDelay: loaded ? `${700 + i * 100}ms` : "0ms" }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <LiquidGlass
                    hovered={hoveredIndex === i}
                    rounded="rounded-xl"
                    className={cn(
                      "py-3 px-5 md:py-3.5 md:px-7 transition-transform duration-300",
                      hoveredIndex === i && "scale-[1.015]"
                    )}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <h2
                          className={cn(
                            "font-brand text-[15px] md:text-base tracking-[0.1em] uppercase transition-colors duration-300",
                            hoveredIndex === i ? "text-cream" : "text-cream/90"
                          )}
                          style={{ fontWeight: 400 }}
                        >
                          {dest.title}
                        </h2>
                        <p
                          className={cn(
                            "text-[9px] md:text-[10px] uppercase tracking-[0.08em] transition-colors duration-300 mt-0.5",
                            hoveredIndex === i ? "text-cream/50" : "text-cream/30"
                          )}
                        >
                          {dest.label}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "flex items-center gap-1.5 shrink-0 transition-all duration-300",
                          hoveredIndex === i ? "opacity-100" : "opacity-30"
                        )}
                      >
                        <span
                          className={cn(
                            "h-px bg-cream/60 transition-all duration-300",
                            hoveredIndex === i ? "w-5" : "w-2"
                          )}
                        />
                        <svg
                          className="w-2.5 h-2.5 text-cream/70"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                          />
                        </svg>
                      </div>
                    </div>
                  </LiquidGlass>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
