import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LiquidGlass } from "@/components/liquid-glass";
import { HeroFilmstrip } from "@/components/home/HeroFilmstrip";
import { SequentialHeroVideo } from "@/components/home/SequentialHeroVideo";
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
      {/* Mobile-only full-viewport sequential video reel. Sits behind the fixed transparent nav. */}
      <section className="md:hidden relative -mt-px">
        <SequentialHeroVideo />
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center"
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
            paddingLeft: "max(1.5rem, env(safe-area-inset-left))",
            paddingRight: "max(1.5rem, env(safe-area-inset-right))",
          }}
        >
          {/* Soft radial vignette behind wordmark — darkens hot frames, lifts dark ones */}
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[55vh] w-[110vw] mix-blend-multiply opacity-70"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.18) 35%, rgba(0,0,0,0) 70%)",
            }}
          />
          <div className="relative">
            <h1
              className="font-brand text-cream"
              style={{
                fontWeight: 700,
                letterSpacing: "-0.01em",
                fontSize: "clamp(2.5rem,11vw,4rem)",
                lineHeight: 1,
                textShadow:
                  "0 1px 2px rgba(0,0,0,0.55), 0 2px 18px rgba(0,0,0,0.45), 0 0 40px rgba(0,0,0,0.35)",
              }}
            >
              ECLECTIC HIVE
            </h1>
            <p
              className="mt-1 font-brand italic text-cream/90"
              style={{
                fontWeight: 400,
                fontSize: "clamp(0.9rem,3.6vw,1.1rem)",
                lineHeight: 1.3,
                textShadow: "0 1px 2px rgba(0,0,0,0.6), 0 1px 10px rgba(0,0,0,0.5)",
              }}
            >
              Designing for Weddings, Corporate, &amp; Social Events
            </p>
          </div>
        </div>
      </section>

      <section className="relative flex flex-col">
        {/* Filmstrip on desktop only — mobile uses the sequential reel above */}
        <div className="hidden md:block">
        {/* Wordmark + welcome heading. pt clears the fixed glass nav. */}
        <div
          className={cn(
            "pt-24 md:pt-28 pb-3 md:pb-4 px-4 text-center transition-opacity duration-700",
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
            className="mx-auto mt-2 max-w-3xl font-brand italic text-charcoal/70"
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
        </div>{/* /desktop-only block */}

      </section>

      {/* Evolution narrative — sticky single-fold; CTA cards ride the end */}
      <EvolutionNarrative
        footer={
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3 md:gap-3">
            {DESTINATIONS.map((dest, i) => (
              <Link
                key={dest.href}
                to={dest.href}
                preload="viewport"
                aria-label={`${dest.title} — ${dest.label}`}
                className="group rounded-xl ring-1 ring-charcoal/10 bg-paper transition-all duration-300 hover:ring-charcoal/30"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="px-5 py-3.5 md:px-6 md:py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <h3
                        className="font-brand uppercase text-charcoal text-[15px] md:text-base"
                        style={{ fontWeight: 400, letterSpacing: "0.1em" }}
                      >
                        {dest.title}
                      </h3>
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
        }
      />

      {/* Keep LiquidGlass referenced to preserve filter prewarm; harmless no-op */}
      <div className="hidden">
        <LiquidGlass>{null}</LiquidGlass>
      </div>
    </main>
  );
}
