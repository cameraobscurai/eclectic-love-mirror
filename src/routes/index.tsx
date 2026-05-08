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
      {/* Mobile-only full-viewport sequential video reel. Sits behind the fixed transparent nav.
          Wordmark sits inside a frosted glass band (no drop-shadow, no radial vignette) —
          matches the brand baseline ("Amangiri photo + frosted glass band wordmark"). */}
      <section className="md:hidden relative -mt-px">
        <SequentialHeroVideo />
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center px-4"
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
            paddingLeft: "max(1rem, env(safe-area-inset-left))",
            paddingRight: "max(1rem, env(safe-area-inset-right))",
          }}
        >
          <div
            className="relative text-center"
            style={{
              padding: "1.25rem 1.5rem 1.35rem",
              // Frosted band — translucent charcoal wash, hairline border,
              // backdrop blur so the video texture reads through.
              background: "rgba(26,26,26,0.28)",
              backdropFilter: "blur(14px) saturate(1.4)",
              WebkitBackdropFilter: "blur(14px) saturate(1.4)",
              borderTop: "1px solid rgba(245,242,237,0.18)",
              borderBottom: "1px solid rgba(245,242,237,0.18)",
              width: "min(92vw, 32rem)",
            }}
          >
            <h1
              className="font-brand text-cream"
              style={{
                fontWeight: 600,
                letterSpacing: "0.02em",
                fontSize: "clamp(2.25rem, 10vw, 3.5rem)",
                lineHeight: 1,
              }}
            >
              ECLECTIC HIVE
            </h1>
            <p
              className="mt-2 font-brand italic text-cream/85"
              style={{
                fontWeight: 400,
                fontSize: "clamp(0.78rem, 3.2vw, 0.95rem)",
                lineHeight: 1.4,
                letterSpacing: "0.02em",
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
          ["--fold-unit" as string]: "clamp(1rem, 0.6rem + 1.1vw, 2.25rem)",
          ["--fold-top" as string]:
            "calc(var(--nav-h, 4rem) + var(--fold-unit) * 4)",
          ["--fold-gap" as string]: "calc(var(--fold-unit) * 1)",
          ["--fold-strip" as string]: "calc(var(--fold-unit) * 3)",
          ["--fold-tail" as string]: "calc(var(--fold-unit) * 6)",
        }}
      >
        {/* Heading + tagline on desktop only — mobile uses the sequential reel above */}
        <div className="hidden md:block">
          <div
            className="fluid-canvas"
            style={{ paddingTop: "var(--fold-top)" }}
          >
            <div className="mx-auto" style={{ maxWidth: "min(72rem, 100%)" }}>
              <h1
                className={cn(
                  "text-center font-display text-charcoal transition-[opacity,transform,letter-spacing] ease-out",
                  loaded
                    ? "opacity-100 translate-y-0 [letter-spacing:-0.012em]"
                    : "opacity-0 translate-y-2 [letter-spacing:0.04em]",
                )}
                style={{
                  fontWeight: 400,
                  // Fluid: anchored at 1600px → ~5.5rem. Locked min/max so
                  // 1280 and 2560 land in the same proportional family.
                  fontSize: "clamp(3.5rem, 1.5rem + 3.2vw, 5.75rem)",
                  lineHeight: 0.95,
                  transitionDuration: "1100ms",
                }}
              >
                ECLECTIC HIVE
              </h1>

              <p
                className={cn(
                  "mx-auto text-center font-display italic text-charcoal/65 transition-all duration-700 ease-out",
                  loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1",
                )}
                style={{
                  marginTop: "var(--fold-gap)",
                  maxWidth: "clamp(28rem, 36vw, 40rem)",
                  fontWeight: 400,
                  fontSize: "clamp(0.95rem, 0.6rem + 0.45vw, 1.15rem)",
                  lineHeight: 1.4,
                  transitionDelay: loaded ? "350ms" : "0ms",
                }}
              >
                Designing for Weddings, Corporate, &amp; Social Events
              </p>
            </div>
          </div>
        </div>

        {/* Filmstrip — desktop renders 5 video frames; mobile renders 5 poster
            tiles. Both routes through the same lightbox. */}
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
