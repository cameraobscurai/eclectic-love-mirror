import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LiquidGlass } from "@/components/liquid-glass";
import { HeroFilmstrip } from "@/components/home/HeroFilmstrip";
import { SequentialHeroVideo } from "@/components/home/SequentialHeroVideo";
import { EvolutionNarrative } from "@/components/home/EvolutionNarrative";
import { DestinationStack } from "@/components/home/DestinationStack";
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

      {/* ── FOLD 1 — Editorial wordmark ───────────────────────
          Rhythm system (single source of truth, no per-element guesses):
            --fold-unit  : modular spacing unit, scales 16→40px with vw+vh
            --fold-top   : breathing band above wordmark (nav clearance + 4 units)
            --fold-gap   : wordmark→tagline (1 unit)
            --fold-strip : tagline→filmstrip (3 units)
            --fold-tail  : filmstrip→Evolution (6 units)
          Every distance below derives from --fold-unit so the whole fold
          breathes proportionally on any screen — no hardcoded magic numbers.
      */}
      <section
        className="relative"
        style={{
          ["--fold-unit" as string]: "clamp(1rem, 1.4vw + 1vh, 2.5rem)",
          ["--fold-top" as string]:
            "calc(var(--nav-h, 4rem) + var(--fold-unit) * 4)",
          ["--fold-gap" as string]: "calc(var(--fold-unit) * 1)",
          ["--fold-strip" as string]: "calc(var(--fold-unit) * 3)",
          ["--fold-tail" as string]: "calc(var(--fold-unit) * 6)",
        }}
      >
        {/* Filmstrip on desktop only — mobile uses the sequential reel above */}
        <div className="hidden md:block">
          <div
            className="px-8 lg:px-12"
            style={{ paddingTop: "var(--fold-top)" }}
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
                  "mx-auto text-center font-display italic text-charcoal/65 transition-all duration-700 ease-out max-w-xl",
                  loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1",
                )}
                style={{
                  marginTop: "var(--fold-gap)",
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

          {/* Filmstrip — set on the modular rhythm, with a real tail before Evolution */}
          <div
            className={cn(
              "transition-all ease-out",
              loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
            )}
            style={{
              paddingTop: "var(--fold-strip)",
              paddingBottom: "var(--fold-tail)",
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
        footer={<DestinationStack destinations={DESTINATIONS} />}
      />

      {/* Keep LiquidGlass referenced to preserve filter prewarm; harmless no-op */}
      <div className="hidden">
        <LiquidGlass>{null}</LiquidGlass>
      </div>
    </main>
  );
}
