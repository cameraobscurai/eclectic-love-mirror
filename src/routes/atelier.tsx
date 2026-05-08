import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MediaAperture } from "@/components/media-aperture";
import { AtelierTeam } from "@/components/atelier/team";
import { heroPreloadLink } from "@/components/hero-image";
import { useBalancedColumnWidth } from "@/hooks/use-balanced-column-width";
import { STORAGE_ORIGIN, renderUrl, renderSrcSet } from "@/lib/storage-image";
import { TEAM } from "@/components/atelier/team";
import { ATELIER_IMAGES, ATELIER_IMAGE_ALT } from "./atelier.images";

// Slot-mapped images — see ./atelier.images.ts. DO NOT replace these inline;
// edit the constants file so each slot stays bound to the correct asset.
const atelierReplacement = ATELIER_IMAGES.HERO_IMAGE;
const atelierHiveTriptych = ATELIER_IMAGES.HIVE_TRIPTYCH;
const atelierSketchDrape = ATELIER_IMAGES.SKETCH_DRAPE;
const atelierCollage = ATELIER_IMAGES.WORKSHOP_COLLAGE;

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
      className="w-full flex items-center justify-center border border-dashed text-[11px] tracking-[0.22em] uppercase text-charcoal/45"
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
    q: "SCOPE OF WORK",
    a: "Eclectic Hive is a full-service design house working domestically and internationally. Our team guides the creative direction of each environment through spatial planning, guest experience, materiality, and atmosphere. Every detail is considered through the lens of flow, composition, and overall cohesion of all design elements, from furniture and lighting to tablescapes, drapery, styling, and custom design development. On site execution and installation oversight ensure continuity from concept through realization.",
  },
  {
    q: "INVENTORY + FABRICATION",
    a: "The Hive Signature Collection includes a curated range of furnishings, lighting, textiles, styling objects, dining pieces, surfaces, and large-scale visual elements available through both rental-only and full-service design projects. The collection is designed to support layered, immersive, and highly intentional environments. Customized inventory and fabrication development are approached through concept direction, material exploration, and design execution. Through collaboration with skilled artisan and production partners, custom pieces and spatial elements are developed to align with the overall atmosphere and experience of each project.",
  },
  {
    q: "WORKING WITH OUR TEAM",
    a: "Our process begins with a consultation designed to better understand the vision, scope of work, and priorities of the overall project. After establishing creative alignment and the investment for design & decor, we create a Style Guide that visually summarizes the proposed direction prior to developing the full design plans. Once vision & direction are aligned, the date of your project is confirmed with a deposit and the full development process begins.",
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
      // Preload the first row of THE HIVE portraits (4 across on desktop).
      // These sit just below the fold and dominate the second paint — kicking
      // them off in the document head lets them race the JS bundle instead
      // of waiting on hydration + IO + image decode.
      ...TEAM.slice(0, 4)
        .filter((m) => m.image?.approvedForWeb)
        .map((m) => ({
          rel: "preload" as const,
          as: "image" as const,
          href: renderUrl(m.image!.src, { width: 720, quality: 70 }),
          imageSrcSet: renderSrcSet(m.image!.src, [360, 540, 720, 1080], 70),
          imageSizes: "(min-width: 1024px) 22vw, (min-width: 768px) 30vw, 46vw",
          fetchPriority: "low" as const,
        })),
    ],
  }),
  component: AtelierPage,
});

function AtelierPage() {
  // --- Fabrication list hover ---------------------------------------------
  const [fabHover, setFabHover] = useState<number | null>(null);

  // --- Hero column balancing ---------------------------------------------
  // Measure headline's actual rendered width (CSS clamp() means computed px
  // changes with viewport — cheaper to read once than to recompute via JS).
  // Then use pretext to find the smallest column width where the body wraps
  // into exactly 2 lines. Final column = max(headline, body-2-line).
  const headlineRef = useRef<HTMLHeadingElement | null>(null);
  const [headlineW, setHeadlineW] = useState<number>(0);
  useEffect(() => {
    const el = headlineRef.current;
    if (!el) return;
    // Headline width is driven by viewport (clamp() font-size) — measure on
    // mount + window resize. Avoid ResizeObserver here: the measured width
    // feeds setHeadlineW → re-render → wrapper width changes → headline
    // re-measures, which loops indefinitely ("ResizeObserver loop completed
    // with undelivered notifications").
    let rafId = 0;
    const measure = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setHeadlineW(el.getBoundingClientRect().width);
      });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", measure);
    };
  }, []);

  const HERO_BODY = "The Atelier is where design authorship, material exploration, and fabrication converge — through process & intention.";
  const balancedW = useBalancedColumnWidth({
    bodyText: HERO_BODY,
    bodyFontPx: 12,
    bodyFontFamily: "Inter",
    bodyFontWeight: 400,
    // tracking-[0.18em] @ 12px = 2.16px. Required — pretext otherwise
    // under-measures and the line count it predicts won't match the browser.
    bodyLetterSpacingPx: 2.16,
    bodyTargetLines: 2,
    headlineWidth: headlineW,
  });

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
      {/* 1 + 2. HERO + THE HIVE — sticky/fluid pattern (mem://design/sticky-fluid-canvas).
          Left col pins on xl+ while the right column (hero image stacked over
          the team grid) scrolls past. Below xl, stacks normally. */}
      <section
        style={{
          paddingTop: "clamp(1.5rem, 1rem + 1.5vw, 3rem)",
          paddingBottom: "clamp(3rem, 1.5rem + 3vw, 5rem)",
        }}
      >
        <div
          className="fluid-canvas grid grid-cols-1 xl:grid-cols-12"
          style={{
            gap: "clamp(2rem, 1rem + 2.5vw, 3rem)",
          }}
        >
          {/* Sticky anchor — eyebrow + headline + body manifesto */}
          <div className="xl:col-span-5 xl:sticky xl:top-32 xl:self-start flex flex-col py-2 md:py-4">
            <p className="atelier-hero-reveal text-[11px] uppercase tracking-[0.22em] text-charcoal/50">
              ATELIER BY THE HIVE
            </p>
            <div
              className="mt-8"
              style={{
                width: balancedW ? `${balancedW}px` : "fit-content",
                maxWidth: "100%",
              }}
            >
              <h1
                ref={headlineRef}
                className="atelier-hero-reveal page-title text-charcoal"
                style={{
                  animationDelay: "80ms",
                  fontSize: "clamp(2.5rem, 8vw, 6rem)",
                  lineHeight: 1,
                  width: "fit-content",
                }}
              >
                IMAGINED.
                <br />
                DESIGNED.
                <br />
                REALIZED.
              </h1>
              <p
                className="atelier-hero-reveal mt-8 text-[12px] uppercase tracking-[0.18em] text-charcoal/70"
                style={{
                  animationDelay: "160ms",
                  lineHeight: 1.8,
                }}
              >
                The Atelier is where design authorship, material exploration, and fabrication converge — through process &amp; intention.
              </p>
            </div>
          </div>

          {/* Scrolling body — tall right-side image gives the pinned headline room to hold. */}
          <div className="xl:col-span-7 min-h-[calc(120svh-var(--nav-h))] flex flex-col justify-start">
            <MediaAperture
              ratio="4/5"
              picture={atelierReplacement}
              alt={ATELIER_IMAGE_ALT.HERO_IMAGE}
              sizes="(min-width: 1280px) 55vw, 100vw"
              lazy={false}
              fetchPriority="high"
            />
          </div>
        </div>
      </section>

      {/* 2. THE HIVE — centered, full-viewport staff spread. */}
      <section className="min-h-[calc(100svh-var(--nav-h))] flex items-center py-[clamp(4rem,2rem+5vw,8rem)]">
        <div className="fluid-canvas w-full">
          <div
            className="border-t pt-10"
            style={{ borderColor: "var(--archive-rule)" }}
          >
            <p className="text-center text-[11px] uppercase tracking-[0.22em] text-charcoal/50 mb-10">
              02 — THE HIVE
            </p>
            <AtelierTeam />
          </div>
        </div>
      </section>

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
                  letterSpacing: "0.04em",
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
          <h2 className="font-display text-[clamp(1.5rem,1rem+0.9vw,2.125rem)] leading-[1.1] uppercase tracking-[0.04em]">
            WORKING WITH THE ATELIER
          </h2>
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
                    <span className="text-[12px] uppercase tracking-[0.18em]">
                      {item.q}
                    </span>
                    <span
                      aria-hidden
                      className="text-charcoal/45 text-lg transition-transform group-open:rotate-45 select-none"
                    >
                      +
                    </span>
                  </summary>
                  <p className="pb-6 max-w-2xl text-[12px] uppercase tracking-[0.18em] leading-[1.8] text-charcoal/75">
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
            <p className="text-[11px] uppercase tracking-[0.22em] text-charcoal/50">
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
              BRING A PROJECT TO THE ATELIER.
            </h2>
            <Link
              to="/contact"
              className="mt-8 inline-block text-[12px] uppercase tracking-[0.18em] border border-charcoal px-6 py-3 hover:bg-charcoal hover:text-cream transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
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
            <p className="text-[11px] uppercase tracking-[0.22em] text-charcoal/50 mb-10">
              {eyebrow}
            </p>
          ) : null}
          {children}
        </div>
      </div>
    </section>
  );
}

