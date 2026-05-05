import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MediaAperture } from "@/components/media-aperture";
import { AtelierTeam } from "@/components/atelier/team";
import { heroPreloadLink } from "@/components/hero-image";
import atelierHero from "@/assets/atelier-hero.png?preset=hero";
import atelierReplacement from "@/assets/atelier-replacement.png?preset=editorial";
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
        content: atelierHero.img.src,
      },
      {
        name: "twitter:image",
        content: atelierHero.img.src,
      },
    ],
    links: [heroPreloadLink(atelierHero)],
  }),
  component: AtelierPage,
});

function AtelierPage() {
  // --- Fabrication list hover ---------------------------------------------
  const [fabHover, setFabHover] = useState<number | null>(null);

  return (
    <main
      className="min-h-screen bg-cream text-charcoal pb-32"
      style={{ paddingTop: "var(--nav-h)" }}
    >
      {/* 1. HERO — static, tightened top padding (T3) */}
      <section
        className="px-6 lg:px-12 overflow-hidden"
        style={{
          paddingTop: "clamp(24px, 3vw, 48px)",
          paddingBottom: "clamp(48px, 5vw, 80px)",
        }}
      >
        <div className="max-w-[1400px] mx-auto grid md:grid-cols-12 gap-10 md:gap-12 items-end">
          <div className="md:col-span-7">
            <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/50">
              ATELIER BY THE HIVE
            </p>
            {/* T5: removed duplicated "WE ARE DESIGNERS, PRODUCERS..." eyebrow.
                Lower instance lives under THE HIVE section. */}
            {/* T17: literal CAPS in source so SR & visual register agree. */}
            <h1 className="mt-6 font-display text-[clamp(2.75rem,7vw,6rem)] leading-[0.95] uppercase tracking-[0.04em]">
              IMAGINED.
              <br />
              DESIGNED.
              <br />
              REALIZED.
            </h1>
            <p className="mt-8 text-xs uppercase tracking-[0.22em] text-charcoal/70 leading-[1.8] max-w-[52ch]">
              The Atelier is where design authorship, material exploration, and fabrication converge — through process &amp; intention.
            </p>
          </div>
          <div className="md:col-span-5">
            {/* T4: owner-supplied bench/tasseled-throws photo pending */}
            <Placeholder ratio="4/5" label="ATELIER PORTRAIT" />
          </div>
        </div>
      </section>

      {/* 2. THE HIVE */}
      <Section eyebrow="02 — THE HIVE">
        <AtelierTeam />
      </Section>

      {/* 3. L'ATELIER (T11) — 3-tile B&W collage of Hive exterior + interior */}
      <Section eyebrow="L'ATELIER">
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Placeholder ratio="4/5" label="STUDIO COLLAGE 1" />
          <Placeholder ratio="4/5" label="STUDIO COLLAGE 2" />
          <Placeholder ratio="4/5" label="STUDIO COLLAGE 3" />
        </div>
      </Section>

      {/* 4. DESIGN + FABRICATION (T12+T13) — DESIGN now first */}
      <Section eyebrow="DESIGN · FABRICATION">
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Placeholder ratio="4/5" label="DESIGN" />
          </div>
          <div>
            <Placeholder ratio="4/5" label="FABRICATION" />
          </div>
        </div>
      </Section>

      {/* 5. THE FABRICATION — capabilities list (T14: explanation pending Wed) */}
      <Section eyebrow="THE FABRICATION">
        <ul style={{ borderColor: "var(--archive-rule)" }}>
          {CAPABILITIES.map((item, i) => {
            const isActive = fabHover === i;
            return (
              <li
                key={item}
                onMouseEnter={() => setFabHover(i)}
                onFocus={() => setFabHover(i)}
                onMouseLeave={() => setFabHover(null)}
                onBlur={() => setFabHover(null)}
                className="relative py-4 flex items-baseline gap-6 border-t first:border-t-0 cursor-default transition-colors duration-300"
                style={{ borderColor: "var(--archive-rule)" }}
                tabIndex={0}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-0 right-0 bottom-0 h-px origin-left transition-transform duration-300 ease-out"
                  style={{
                    backgroundColor: "color-mix(in oklab, var(--charcoal) 20%, transparent)",
                    transform: isActive ? "scaleX(1)" : "scaleX(0)",
                  }}
                />
                <span
                  className={
                    "text-[10px] tracking-[0.22em] tabular-nums w-8 transition-colors duration-300 " +
                    (isActive ? "text-charcoal/85" : "text-charcoal/40")
                  }
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={
                    "text-[13px] tracking-[0.18em] uppercase transition-colors duration-300 " +
                    (isActive ? "text-charcoal" : "text-charcoal/85")
                  }
                >
                  {item}
                </span>
              </li>
            );
          })}
        </ul>
        {/* T15: Phase-2 botanical/sketch triptych removed pending future direction */}
      </Section>

      {/* 5. ATELIER APPROACH — quiet text-only triplet */}
      <Section eyebrow="ATELIER APPROACH">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-10">
          {APPROACH_STEPS.map((step) => (
            <div key={step.number}>
              <p
                className="font-display text-2xl text-charcoal/45 tabular-nums border-t pt-4"
                style={{ borderColor: "var(--archive-rule)" }}
              >
                {step.number}
              </p>
              <h3 className="mt-3 font-display text-3xl uppercase tracking-[0.06em]">
                {step.label}
              </h3>
            </div>
          ))}
        </div>
      </Section>

      {/* 6. CTA */}
      <section className="px-6 lg:px-12 mt-24">
        <div className="max-w-[1400px] mx-auto">
          <div
            className="border-t pt-12"
            style={{ borderColor: "var(--archive-rule)" }}
          >
            <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/50">
              BEGIN
            </p>
            <h2 className="mt-4 font-display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] uppercase tracking-[0.04em] max-w-2xl">
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
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-6 lg:px-12 mt-24">
      <div className="max-w-[1400px] mx-auto">
        <div
          className="border-t pt-10"
          style={{ borderColor: "var(--archive-rule)" }}
        >
          <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/50 mb-10">
            {eyebrow}
          </p>
          {children}
        </div>
      </div>
    </section>
  );
}

