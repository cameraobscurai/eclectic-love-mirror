import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LiquidGlass } from "@/components/liquid-glass";
import { HeroFilmstrip } from "@/components/home/HeroFilmstrip";
import { EvolutionNarrative } from "@/components/home/EvolutionNarrative";
import { cn } from "@/lib/utils";

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
  { href: "/atelier", label: "The Design House", title: "Atelier" },
  { href: "/collection", label: "Hive Signature Collection", title: "Collection" },
  { href: "/gallery", label: "Selected Works", title: "Gallery" },
] as const;

function HomePage() {
  const [loaded, setLoaded] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setLoaded(true));
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, []);

  return (
    <main id="main-content" className="bg-paper">
      <section className="relative flex flex-col">
        {/* Wordmark + welcome heading. pt clears the fixed glass nav. */}
        <div
          className={cn(
            "pt-28 md:pt-32 pb-6 md:pb-10 px-4 text-center transition-opacity duration-700",
            loaded ? "opacity-100" : "opacity-0",
          )}
        >
          <h1
            className="font-brand uppercase text-charcoal"
            style={{
              fontWeight: 400,
              letterSpacing: "0.06em",
              fontSize: "clamp(2.25rem, 6vw, 4.5rem)",
              lineHeight: 1,
            }}
          >
            Eclectic&nbsp;Hive
          </h1>
          <p
            className="mx-auto mt-3 md:mt-4 max-w-3xl font-brand italic text-charcoal/70"
            style={{
              fontWeight: 400,
              fontSize: "clamp(0.9rem, 1.3vw, 1.15rem)",
              lineHeight: 1.4,
            }}
          >
            Designing for Weddings, Corporate, &amp; Social Events
          </p>
        </div>

        {/* Filmstrip — center stage */}
        <div
          className={cn(
            "transition-opacity duration-1000",
            loaded ? "opacity-100" : "opacity-0",
          )}
          style={{ transitionDelay: loaded ? "150ms" : "0ms" }}
        >
          <HeroFilmstrip />
        </div>

        {/* CTA bar */}
        <div className="px-4 pb-8 pt-8 md:px-8 md:pb-12 md:pt-12">
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3 md:gap-3">
              {DESTINATIONS.map((dest, i) => (
                <Link
                  key={dest.href}
                  to={dest.href}
                  preload="viewport"
                  aria-label={`${dest.title} — ${dest.label}`}
                  className={cn(
                    "group rounded-xl ring-1 ring-charcoal/10 bg-paper transition-all duration-700 hover:ring-charcoal/30",
                    loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
                  )}
                  style={{ transitionDelay: loaded ? `${300 + i * 80}ms` : "0ms" }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <div className="px-5 py-3.5 md:px-7 md:py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <h2
                          className="font-brand uppercase text-charcoal text-[15px] md:text-base"
                          style={{ fontWeight: 400, letterSpacing: "0.1em" }}
                        >
                          {dest.title}
                        </h2>
                        <p className="mt-0.5 text-[9px] md:text-[10px] uppercase tracking-[0.08em] text-charcoal/50">
                          {dest.label}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "flex shrink-0 items-center gap-1.5 transition-all duration-300",
                          hoveredIndex === i ? "opacity-100" : "opacity-40",
                        )}
                      >
                        <span
                          className={cn(
                            "h-px bg-charcoal/60 transition-all duration-300",
                            hoveredIndex === i ? "w-5" : "w-2",
                          )}
                        />
                        <svg
                          className="h-2.5 w-2.5 text-charcoal/70"
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
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Evolution narrative — scroll-driven manifesto */}
      <EvolutionNarrative />

      {/* Keep LiquidGlass referenced to preserve filter prewarm; harmless no-op */}
      <div className="hidden">
        <LiquidGlass>{null}</LiquidGlass>
      </div>
    </main>
  );
}
