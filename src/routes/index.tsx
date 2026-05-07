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

      <section className="relative">
        {/* Filmstrip on desktop only — mobile uses the sequential reel above */}
        <div className="hidden md:block">
          {/* ── FOLD 1 — Editorial wordmark ─────────────────────
              Composition matches reference inspo:
                • Wordmark sits ~one nav-height below the bar
                • Tagline tucked tight under the wordmark
                • Filmstrip follows with a single editorial gap
                • No 100svh stretching — content sets the rhythm,
                  not the viewport
          */}
          <div
            className="px-8 lg:px-12"
            style={{
              paddingTop: "calc(var(--nav-h, 4rem) + clamp(2rem, 4vh, 3.5rem))",
            }}
          >
            <div className="mx-auto max-w-6xl">
              <h1
                className={cn(
                  "text-center font-display text-charcoal transition-[opacity,transform,letter-spacing] ease-out",
                  loaded
                    ? "opacity-100 translate-y-0 [letter-spacing:-0.012em]"
                    : "opacity-0 translate-y-2 [letter-spacing:0.04em]",
                )}
                style={{
                  fontWeight: 400,
                  fontSize: "clamp(3rem, 7vw, 6rem)",
                  lineHeight: 0.95,
                  transitionDuration: "1100ms",
                }}
              >
                ECLECTIC HIVE
              </h1>

              <p
                className={cn(
                  "mx-auto mt-3 md:mt-4 max-w-xl text-center font-display italic text-charcoal/65 transition-all duration-700 ease-out",
                  loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1",
                )}
                style={{
                  fontWeight: 400,
                  fontSize: "clamp(0.95rem, 1.2vw, 1.1rem)",
                  lineHeight: 1.4,
                  transitionDelay: loaded ? "350ms" : "0ms",
                }}
              >
                Designing for Weddings, Corporate, &amp; Social Events
              </p>
            </div>
          </div>

          {/* Filmstrip — single editorial gap below the tagline */}
          <div
            className={cn(
              "transition-all ease-out",
              loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
            )}
            style={{
              paddingTop: "clamp(2.5rem, 5vh, 4rem)",
              transitionDuration: "1200ms",
              transitionDelay: loaded ? "650ms" : "0ms",
            }}
          >
            <HeroFilmstrip />
          </div>
        </div>{/* /desktop-only block */}

      </section>

      {/* ── FOLD 3 — Index-style destinations ─────────────────
          Stacked hairline rows, monograph index feel.
          Each row: number · title · descriptor · arrow.
          Hover shifts the arrow + lifts the row tone, no fills, no rings.
      */}
      <EvolutionNarrative
        footer={
          <div className="border-t border-charcoal/15 grid grid-cols-1 md:grid-cols-3 md:divide-x md:divide-charcoal/15">
            {DESTINATIONS.map((dest, i) => (
              <Link
                key={dest.href}
                to={dest.href}
                preload="viewport"
                aria-label={`${dest.title} — ${dest.label}`}
                className="group block border-b border-charcoal/15 md:border-b-0"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="flex items-baseline gap-4 md:flex-col md:items-start md:gap-2 px-4 md:px-6 py-5 md:py-7">
                  <h3
                    className="font-brand uppercase text-charcoal transition-colors duration-300"
                    style={{
                      fontWeight: 500,
                      letterSpacing: "0.03em",
                      fontSize: "clamp(1.05rem, 1.5vw, 1.35rem)",
                      lineHeight: 1,
                    }}
                  >
                    {dest.title}
                  </h3>

                  <p
                    className="font-brand italic text-charcoal/55 truncate"
                    style={{
                      fontWeight: 400,
                      fontSize: "clamp(0.8rem, 0.95vw, 0.95rem)",
                    }}
                  >
                    {dest.label}
                  </p>

                  <svg
                    className={cn(
                      "ml-auto md:ml-0 md:mt-3 h-3.5 w-3.5 shrink-0 text-charcoal/60 transition-transform duration-500 ease-out",
                      hoveredIndex === i ? "translate-x-1" : "translate-x-0",
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.25}
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
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
