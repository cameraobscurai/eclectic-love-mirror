import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LiquidGlass } from "@/components/liquid-glass";
import { cn } from "@/lib/utils";
import homeHero from "@/assets/home-hero.png";

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

  return (
    <main
      id="main-content"
      className="bg-charcoal lg:overflow-hidden"
      style={{ overscrollBehavior: "none" }}
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
          Backdrop — the entire editorial composition (triptych glass plates,
          sketch + swatch moodboard, etched ECLECTIC HIVE wordmark on the
          center plate) is baked into a single image. We render it full-bleed
          and let the rest of the page (CTA bar) sit on top.

          A live <h1> remains in the DOM as sr-only so SEO and assistive tech
          still pick up the brand name even though the visible mark lives
          inside the artwork.
        */}
        <img
          src={homeHero}
          alt=""
          aria-hidden="true"
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-1000",
            "object-[50%_25%] md:object-[50%_38%]",
            loaded ? "opacity-100" : "opacity-0"
          )}
          draggable={false}
        />

        {/* Wordmark — sits inside the empty horizontal glass band baked into
            the artwork. Uses clamp() so it scales fluidly to fit the band on
            every viewport, from 320px phones to ultra-wide desktops. */}
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-x-0 z-10 flex justify-center pointer-events-none transition-opacity duration-1000",
            "top-[46%] md:top-[49%]",
            loaded ? "opacity-100" : "opacity-0"
          )}
          style={{ transitionDelay: loaded ? "300ms" : "0ms" }}
        >
          <div
            className="font-brand text-cream/85 uppercase whitespace-nowrap text-center"
            style={{
              fontWeight: 400,
              letterSpacing: "0.32em",
              fontSize: "clamp(1.1rem, 6.2vw, 5.25rem)",
              lineHeight: 1,
              textShadow: "0 1px 24px color-mix(in oklab, var(--charcoal) 35%, transparent)",
            }}
          >
            Eclectic&nbsp;Hive
          </div>
        </div>

        {/* Bottom legibility wash — keeps the LiquidGlass CTA bar readable
            against the moodboard texture without dimming the wordmark plate. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[28%] pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, transparent 0%, color-mix(in oklab, var(--charcoal) 55%, transparent) 100%)",
          }}
        />

        {/* SEO / a11y wordmark — visible mark is in the backdrop image. */}
        <h1 className="sr-only">ECLECTIC HIVE — Luxury Event Design &amp; Production</h1>

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
                  style={{ transitionDelay: loaded ? `${500 + i * 100}ms` : "0ms" }}
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
