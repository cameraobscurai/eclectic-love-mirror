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
          {/* ── FOLD 1 — Editorial wordmark ─────────────────────
              Composition rules:
                • Eyebrow rail (label + hairline) sits flush at top of fold
                • Wordmark on optical thirds, max-w-5xl tight
                • Tagline pulled close, set in italic at minor-third scale
                • Measured spacing snaps to a 12px baseline (1.5rem · 0.75rem · 0.5rem)
          */}
          <div
            className={cn(
              "px-8 lg:px-12 transition-opacity duration-700",
              loaded ? "opacity-100" : "opacity-0",
            )}
            style={{ paddingTop: "clamp(6rem, 9vh, 7.5rem)", paddingBottom: "clamp(1.25rem, 2.5vh, 2rem)" }}
          >
            <div className="mx-auto max-w-6xl">

              <h1
                className="text-center font-brand text-charcoal"
                style={{
                  fontWeight: 600,
                  letterSpacing: "-0.008em",
                  fontSize: "clamp(2.25rem, 5.2vw, 4rem)",
                  lineHeight: 0.98,
                }}
              >
                ECLECTIC HIVE
              </h1>

              <p
                className="mx-auto mt-2.5 md:mt-3 max-w-xl text-center font-brand italic text-charcoal/65"
                style={{
                  fontWeight: 400,
                  fontSize: "clamp(0.9rem, 1.15vw, 1.05rem)",
                  lineHeight: 1.4,
                }}
              >
                Designing for Weddings, Corporate, &amp; Social Events
              </p>
            </div>
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

          {/* Breathing room before the Evolution fold */}
          <div className="h-24 md:h-32 lg:h-40" aria-hidden />
        </div>{/* /desktop-only block */}

      </section>

      {/* ── FOLD 3 — Index-style destinations ─────────────────
          Stacked hairline rows, monograph index feel.
          Each row: number · title · descriptor · arrow.
          Hover shifts the arrow + lifts the row tone, no fills, no rings.
      */}
      <EvolutionNarrative
        footer={
          <div className="border-t border-charcoal/15">
            {DESTINATIONS.map((dest, i) => (
              <Link
                key={dest.href}
                to={dest.href}
                preload="viewport"
                aria-label={`${dest.title} — ${dest.label}`}
                className="group block border-b border-charcoal/15"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="flex items-baseline gap-4 md:gap-5 py-5 md:py-6">
                  {/* Title — the hero word */}
                  <h3
                    className={cn(
                      "font-brand uppercase text-charcoal transition-colors duration-300",
                      "group-hover:text-charcoal",
                    )}
                    style={{
                      fontWeight: 500,
                      letterSpacing: "0.03em",
                      fontSize: "clamp(1.15rem, 1.9vw, 1.6rem)",
                      lineHeight: 1,
                    }}
                  >
                    {dest.title}
                  </h3>

                  {/* Descriptor — italic, sits right alongside */}
                  <p
                    className="font-brand italic text-charcoal/50 truncate"
                    style={{
                      fontWeight: 400,
                      fontSize: "clamp(0.85rem, 1vw, 1rem)",
                    }}
                  >
                    {dest.label}
                  </p>

                  {/* Arrow — pinned right, no rail */}
                  <svg
                    className={cn(
                      "ml-auto h-3.5 w-3.5 shrink-0 text-charcoal/60 transition-transform duration-500 ease-out",
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

                {/* Mobile descriptor — sits below the row, indented past the numeral */}
                <p
                  className="md:hidden -mt-3 pb-5 pl-12 font-brand italic text-charcoal/55"
                  style={{ fontWeight: 400, fontSize: "0.85rem" }}
                >
                  {dest.label}
                </p>
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
