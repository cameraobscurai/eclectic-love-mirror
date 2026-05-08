import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MediaAperture } from "@/components/media-aperture";
import { AtelierTeam } from "@/components/atelier/team";
import { heroPreloadLink } from "@/components/hero-image";
import { STORAGE_ORIGIN } from "@/lib/storage-image";
import atelierReplacement from "@/assets/atelier-replacement.jpg?preset=hero";

import atelierSketchDrape from "@/assets/atelier/atelier-sketch-drape.png?preset=editorial";
import atelierCollage from "@/assets/atelier/atelier-collage.jpg?preset=editorial";
import atelierHiveTriptych from "@/assets/atelier/atelier-hive-triptych.jpeg?preset=editorial";
import imaginedTent from "@/assets/atelier/imagined-tent-sketch.png?preset=editorial";
import designedSofa from "@/assets/atelier/designed-sofa-wireframe.png?preset=editorial";
import realizedCeremony from "@/assets/atelier/realized-aspen-ceremony.webp?preset=editorial";

// Owner-supplied photos pending — render quiet, intentional waiting state.
function Placeholder({
  ratio,
  label,
}: {
  ratio: string;
  label: string;
}) {
  return (
    <div
      className="w-full flex items-center justify-center border border-dashed text-[10px] tracking-[0.28em] uppercase text-charcoal/45"
      style={{
        aspectRatio: ratio,
        backgroundColor: "color-mix(in oklab, var(--charcoal) 4%, transparent)",
        borderColor: "color-mix(in oklab, var(--charcoal) 25%, transparent)",
      }}
      role="img"
      aria-label={`Placeholder — ${label}`}
    >
      [{label}]
    </div>
  );
}

// ---------------------------------------------------------------------------
// Atelier by The Hive — operational proof page
//
// Six sections in fixed order:
//   1. Hero
//   2. THE HIVE       (real staff module)
//   3. The Artist's Studio
//   4. Scope + Fabrication (interactive hover reveal — Pass 3)
//   5. Atelier Approach    (scroll-pinned triptych — Pass 3)
//   6. CTA
// ---------------------------------------------------------------------------



const CAPABILITIES = [
  "LOUNGE FURNITURE",
  "BARS + COCKTAIL TABLES",
  "LIGHTING",
  "TABLEWARE",
  "DINING TABLES + CHAIRS",
  "CUSTOM DESIGN + FABRICATION",
  "STAGE DESIGN",
  "DRAPE",
  "ACCENTS + STYLING",
  "PRODUCTION MANAGEMENT",
];

// Mirrors the FAQ block on /contact. Owner-approved copy from contact.tsx —
// kept duplicated for now; lift to a shared module if the lists diverge.
const ATELIER_FAQ: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: "WHAT WE OFFER",
    a: "Full-service design, fabrication, and production — or rental-only access to the Hive Signature Collection. Engagements include space planning + CAD, 3-D modeling, vendor management, on-site logistics, and run of show.",
  },
  {
    q: "HOW TO BEGIN A PROPOSAL",
    a: "After a consultation call we'll prepare a one to two-page Style Guide that visually summarizes the design direction. A non-refundable Creative Services Fee and signed contract secures the date and unlocks the full proposal and detailed estimate.",
  },
  {
    q: "TRAVEL",
    a: "Eclectic Hive is a destination design house. Projects take us domestic and international — desert, mountains, and the Caribbean. Travel fees include accommodations, per diems, and mileage.",
  },
  {
    q: "MINIMUMS",
    a: "We don't set fixed minimums. Availability shifts with the team's existing committed work and the seasonality of inquiries. Each opportunity is reviewed together to make sure we can deliver the requested scope.",
  },
];

// (Removed: per-capability image swap was overengineered. The original
// three-square material board sits below the list as quiet evidence.)

const APPROACH_STEPS = [
  {
    number: "01",
    label: "IMAGINED",
    image: {
      src: imaginedTent,
      alt: "Hand-drawn pencil sketch — interior of a tented event with draped panels and a central tree.",
    },
  },
  {
    number: "02",
    label: "DESIGNED",
    image: {
      src: designedSofa,
      alt: "Technical line drawing of a fringed sofa — design phase rendering.",
    },
  },
  {
    number: "03",
    label: "REALIZED",
    image: {
      src: realizedCeremony,
      alt: "Realized installation — outdoor ceremony aisle framed by autumn aspens in the Colorado mountains.",
    },
  },
] as const;

export const Route = createFileRoute("/atelier")({
  head: () => ({
    meta: [
      {
        title: "Atelier by The Hive — Design + Fabrication | Eclectic Hive",
      },
      {
        name: "description",
        content:
          "Atelier by The Hive: designers, producers, and a fabrication house. Imagined. Designed. Realized.",
      },
      {
        property: "og:title",
        content: "Atelier by The Hive — Eclectic Hive",
      },
      {
        property: "og:description",
        content: "Imagined. Designed. Realized. Design + fabrication studio.",
      },
      {
        property: "og:image",
        content: atelierReplacement.img.src,
      },
      {
        name: "twitter:image",
        content: atelierReplacement.img.src,
      },
    ],
    links: [
      // The hero is a 40vw editorial column on desktop, full-width on mobile.
      // Pass that sizes hint so the preload scanner picks ~768/1280 instead
      // of the 2560 variant we'd burn on a full-bleed hero.
      heroPreloadLink(atelierReplacement, "(min-width: 768px) 40vw, 100vw"),
      // Warm the TLS connection to Supabase storage before the first
      // portrait scrolls into view — saves ~100-300ms on the first image.
      ...(STORAGE_ORIGIN
        ? [
            { rel: "preconnect", href: STORAGE_ORIGIN, crossOrigin: "anonymous" as const },
            { rel: "dns-prefetch", href: STORAGE_ORIGIN },
          ]
        : []),
    ],
  }),
  component: AtelierPage,
});

function AtelierPage() {
  // --- Fabrication list hover ---------------------------------------------
  const [fabHover, setFabHover] = useState<number | null>(null);

  return (
    <main
      className="min-h-screen bg-cream text-charcoal pb-32"
      style={{
        paddingTop: "var(--nav-h)",
        // Atelier reads narrower than home — pin the canvas to 1400 here so
        // the editorial column doesn't blow out on ultrawides. Sections
        // inherit via .fluid-canvas.
        ["--canvas-max" as string]: "1400px",
        // Shared section rhythm — every Section spaces itself off this.
        ["--section-gap" as string]: "clamp(4rem, 2rem + 4vw, 8rem)",
      }}
    >
      <style>{`
        @keyframes atelier-hero-reveal {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .atelier-hero-reveal {
          opacity: 0;
          animation: atelier-hero-reveal 640ms ease-out forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .atelier-hero-reveal { animation-duration: 1ms; }
        }
      `}</style>
      {/* 1. HERO — static, tightened top padding (T3) */}
      <section
        className="overflow-hidden"
        style={{
          paddingTop: "clamp(1.5rem, 1rem + 1.5vw, 3rem)",
          paddingBottom: "clamp(3rem, 1.5rem + 3vw, 5rem)",
        }}
      >
        <div
          className="fluid-canvas grid md:grid-cols-12 items-stretch"
          style={{
            gap: "clamp(2rem, 1rem + 2.5vw, 3rem)",
          }}
        >
          <div className="md:col-span-7 flex flex-col justify-between min-h-full py-2 md:py-4">
            <p
              className="atelier-hero-reveal uppercase text-charcoal/50"
              style={{
                fontSize: "clamp(0.625rem, 0.5rem + 0.15vw, 0.75rem)",
                letterSpacing: "0.3em",
              }}
            >
              ATELIER BY THE HIVE
            </p>
            {/* T17: literal CAPS in source so SR & visual register agree. */}
            <h1
              className="atelier-hero-reveal page-title text-charcoal"
              style={{ animationDelay: "80ms" }}
            >
              IMAGINED.
              <br />
              DESIGNED.
              <br />
              REALIZED.
            </h1>
            <p
              className="atelier-hero-reveal uppercase text-charcoal/70"
              style={{
                animationDelay: "160ms",
                fontSize: "clamp(0.75rem, 0.6rem + 0.2vw, 0.875rem)",
                letterSpacing: "0.22em",
                lineHeight: 1.8,
                maxWidth: "52ch",
              }}
            >
              The Atelier is where design authorship, material exploration, and fabrication converge — through process &amp; intention.
            </p>
          </div>
          <div className="md:col-span-5">
            <MediaAperture
              ratio="4/5"
              picture={atelierReplacement}
              alt="Styled bench with tasseled throws."
              sizes="(min-width: 768px) 40vw, 100vw"
              lazy={false}
              fetchPriority="high"
            />
          </div>
        </div>
      </section>

      {/* 2. THE HIVE */}
      <Section eyebrow="02 — THE HIVE">
        <AtelierTeam />
      </Section>

      {/* 3. L'ATELIER — triptych above, then collage + sketch drape side by side (swapped) */}
      <Section eyebrow="L'ATELIER">
        {/* Triptych is a 3:1 horizontal — readable on tablet+. Below sm we
            relax to 5:3 so the three sub-frames are tall enough to read. */}
        <div className="mt-4 [&_figure]:[aspect-ratio:5/3_!important] sm:[&_figure]:[aspect-ratio:3/1_!important]">
          <MediaAperture
            ratio="3/1"
            picture={atelierHiveTriptych}
            alt="The Hive — exterior signage, interior atrium with steel mezzanine, and studio offices."
            sizes="100vw"
            prefetchMargin="1600px"
          />
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <MediaAperture
            ratio="4/5"
            picture={atelierSketchDrape}
            alt="Hand-drawn chair sketch on hanging drape — design phase."
            sizes="(min-width: 768px) 45vw, 100vw"
            prefetchMargin="1600px"
          />
          <MediaAperture
            ratio="4/5"
            picture={atelierCollage}
            alt="Studio collage — fabrication, sketching, and finished detail."
            sizes="(min-width: 768px) 45vw, 100vw"
            prefetchMargin="1600px"
          />
        </div>
      </Section>

      {/* 4. ATELIER APPROACH — quiet text-only triplet (above FAQ) */}
      <Section eyebrow="ATELIER APPROACH">
        <div
          className="grid grid-cols-1 md:grid-cols-3"
          style={{ gap: "clamp(2rem, 1rem + 2.5vw, 3rem)" }}
        >
          {APPROACH_STEPS.map((step) => (
            <div key={step.number}>
              <p
                className="font-display text-charcoal/45 tabular-nums border-t pt-4"
                style={{
                  borderColor: "var(--archive-rule)",
                  fontSize: "clamp(1.25rem, 0.9rem + 0.5vw, 1.625rem)",
                }}
              >
                {step.number}
              </p>
              <h3
                className="mt-3 font-display uppercase"
                style={{
                  fontSize: "clamp(1.5rem, 1rem + 0.9vw, 2.125rem)",
                  letterSpacing: "0.06em",
                }}
              >
                {step.label}
              </h3>
            </div>
          ))}
        </div>
      </Section>

      {/* 5. WORKING WITH THE ATELIER — FAQ accordion */}
      <Section>
        <div>
          <h3 className="font-display text-[clamp(1.5rem,3vw,2.25rem)] leading-[1.1] uppercase tracking-[0.04em]">
            WORKING WITH THE ATELIER
          </h3>
          <ul
            className="mt-8 divide-y max-w-3xl"
            style={{ borderColor: "var(--archive-rule)" }}
          >
            {ATELIER_FAQ.map((item) => (
              <li
                key={item.q}
                className="border-t first:border-t-0"
                style={{ borderColor: "var(--archive-rule)" }}
              >
                <details className="group">
                  <summary className="flex items-baseline justify-between gap-4 py-5 cursor-pointer list-none focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream">
                    <span className="font-display text-xl uppercase tracking-[0.06em]">
                      {item.q}
                    </span>
                    <span
                      aria-hidden
                      className="text-charcoal/45 text-lg transition-transform group-open:rotate-45 select-none"
                    >
                      +
                    </span>
                  </summary>
                  <p className="pb-6 max-w-2xl text-[15px] leading-relaxed text-charcoal/75">
                    {item.a}
                  </p>
                </details>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-[11px] uppercase tracking-[0.22em] text-charcoal/55">
            MORE QUESTIONS?{" "}
            <Link to="/contact" hash="faq" className="editorial-link">
              SEE THE FULL FAQ
            </Link>
          </p>
        </div>
      </Section>

      {/* 6. CTA */}
      <section style={{ marginTop: "var(--section-gap)" }}>
        <div className="fluid-canvas">
          <div
            className="border-t pt-12"
            style={{ borderColor: "var(--archive-rule)" }}
          >
            <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/50">
              BEGIN
            </p>
            <h2
              className="mt-4 font-display uppercase max-w-2xl"
              style={{
                fontSize: "clamp(2rem, 1rem + 2.5vw, 3.5rem)",
                lineHeight: 1.05,
                letterSpacing: "0.04em",
              }}
            >
              Bring a project to the Atelier.
            </h2>
            <Link
              to="/contact"
              className="mt-8 inline-block text-xs uppercase tracking-[0.22em] border border-charcoal px-6 py-3 hover:bg-charcoal hover:text-cream transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
            >
              START A CONVERSATION
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Section({
  eyebrow,
  children,
}: {
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: "var(--section-gap)" }}>
      <div className="fluid-canvas">
        <div
          className="border-t pt-10"
          style={{ borderColor: "var(--archive-rule)" }}
        >
          {eyebrow ? (
            <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/50 mb-10">
              {eyebrow}
            </p>
          ) : null}
          {children}
        </div>
      </div>
    </section>
  );
}

