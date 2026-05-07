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
            style={{ paddingTop: "clamp(7rem, 11vh, 9rem)", paddingBottom: "clamp(2rem, 4vh, 3rem)" }}
          >
            <div className="mx-auto max-w-6xl">
              {/* Eyebrow rail — frames the wordmark, signals editorial intent */}
              <div className="flex items-center justify-center gap-3 mb-6 md:mb-8">
                <span className="h-px w-8 bg-charcoal/25" aria-hidden />
                <span
                  className="font-brand uppercase text-charcoal/55"
                  style={{
                    fontWeight: 400,
                    letterSpacing: "0.36em",
                    fontSize: "clamp(0.65rem, 0.78vw, 0.78rem)",
                  }}
                >
                  Est · Denver · Colorado
                </span>
                <span className="h-px w-8 bg-charcoal/25" aria-hidden />
              </div>

              <h1
                className="text-center font-brand text-charcoal"
                style={{
                  fontWeight: 600,
                  letterSpacing: "-0.012em",
                  fontSize: "clamp(2.75rem, 7.4vw, 5.75rem)",
                  lineHeight: 0.95,
                }}
              >
                ECLECTIC HIVE
              </h1>

              <p
                className="mx-auto mt-3 md:mt-4 max-w-xl text-center font-brand italic text-charcoal/65"
                style={{
                  fontWeight: 400,
                  fontSize: "clamp(0.95rem, 1.25vw, 1.15rem)",
                  lineHeight: 1.4,
                }}
              >
                Designing for Weddings, Corporate, &amp; Social Events
              </p>
            </div>
          </div>

          {/* Filmstrip — center stage. Top-margin matches the eyebrow rhythm. */}
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
                className="group block border-b border-charcoal/15 transition-colors duration-300 hover:bg-charcoal/[0.03]"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="flex items-center gap-6 md:gap-10 py-5 md:py-7">
                  {/* Index numeral */}
                  <span
                    className="font-brand text-charcoal/40 tabular-nums w-6 md:w-8 shrink-0"
                    style={{
                      fontWeight: 400,
                      fontSize: "clamp(0.7rem, 0.85vw, 0.8rem)",
                      letterSpacing: "0.18em",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  {/* Title — the hero word in the row */}
                  <h3
                    className="font-brand uppercase text-charcoal flex-shrink-0"
                    style={{
                      fontWeight: 500,
                      letterSpacing: "0.04em",
                      fontSize: "clamp(1.25rem, 2.2vw, 1.85rem)",
                    }}
                  >
                    {dest.title}
                  </h3>

                  {/* Descriptor — italic, muted, takes available space */}
                  <p
                    className="hidden md:block flex-1 font-brand italic text-charcoal/55 truncate"
                    style={{
                      fontWeight: 400,
                      fontSize: "clamp(0.9rem, 1.1vw, 1.05rem)",
                    }}
                  >
                    {dest.label}
                  </p>

                  {/* Arrow rail — extends on hover */}
                  <div className="ml-auto md:ml-0 flex shrink-0 items-center gap-2">
                    <span
                      className={cn(
                        "h-px bg-charcoal/40 transition-all duration-500 ease-out",
                        hoveredIndex === i ? "w-12 md:w-16" : "w-4 md:w-6",
                      )}
                    />
                    <svg
                      className="h-3 w-3 text-charcoal/70 transition-transform duration-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.25}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                      />
                    </svg>
                  </div>
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
