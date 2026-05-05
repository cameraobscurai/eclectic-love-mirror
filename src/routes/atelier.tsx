import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MediaAperture } from "@/components/media-aperture";
import { AtelierTeam } from "@/components/atelier/team";
import { heroPreloadLink } from "@/components/hero-image";
import atelierHero from "@/assets/atelier-hero.png?preset=hero";
import atelierReplacement from "@/assets/atelier-replacement.png?preset=editorial";
import atelierCollage from "@/assets/atelier/atelier-collage.png?preset=editorial";
import atelierSketchDrape from "@/assets/atelier/atelier-sketch-drape.png?preset=editorial";
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
    q: "What we offer",
    a: "Full-service design, fabrication, and production — or rental-only access to the Hive Signature Collection. Engagements include space planning + CAD, 3-D modeling, vendor management, on-site logistics, and run of show.",
  },
  {
    q: "How to begin a proposal",
    a: "After a consultation call we'll prepare a one to two-page Style Guide that visually summarizes the design direction. A non-refundable Creative Services Fee and signed contract secures the date and unlocks the full proposal and detailed estimate.",
  },
  {
    q: "Travel",
    a: "Eclectic Hive is a destination design house. Projects take us domestic and international — desert, mountains, and the Caribbean. Travel fees include accommodations, per diems, and mileage.",
  },
  {
    q: "Minimums",
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
            <MediaAperture
              ratio="4/5"
              picture={atelierReplacement}
              alt="Styled bench with tasseled throws."
              sizes="(min-width: 768px) 40vw, 100vw"
            />
          </div>
        </div>
      </section>

      {/* 2. THE HIVE */}
      <Section eyebrow="02 — THE HIVE">
        <AtelierTeam />
      </Section>

      {/* 3. L'ATELIER — B&W studio collage */}
      <Section eyebrow="L'ATELIER">
        <div className="mt-12 max-w-3xl mx-auto">
          <MediaAperture
            ratio="4/5"
            picture={atelierCollage}
            alt="Studio collage — Hive workbench, design table, and styled bench detail."
            sizes="(min-width: 768px) 60vw, 100vw"
          />
        </div>
      </Section>

      {/* 4. DESIGN + FABRICATION — DESIGN first */}
      <Section eyebrow="DESIGN · FABRICATION">
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <MediaAperture
              ratio="4/5"
              picture={atelierSketchDrape}
              alt="Hand-drawn chair sketch on hanging drape — design phase."
              sizes="(min-width: 768px) 45vw, 100vw"
            />
          </div>
          <div>
            <Placeholder ratio="4/5" label="FABRICATION" />
          </div>
        </div>
      </Section>

      {/* 5. THE FABRICATION — capabilities list hidden pending owner copy */}
      <Section>
        {/* Capabilities list temporarily hidden — keep FAQ below */}
        {/* T15: Phase-2 botanical/sketch triptych removed pending future direction */}

        {/* T16: Atelier FAQ — same accordion she remembers from /contact,
            now placed exactly where she expects it. Mirrors the four
            entries on Contact so a single edit there keeps both in sync
            once we lift this to a shared module. */}
        <div className="mt-20">
          <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/50">
            FREQUENTLY ASKED
          </p>
          <h3 className="mt-4 font-display text-[clamp(1.5rem,3vw,2.25rem)] leading-[1.1] tracking-tight">
            Working with the Atelier.
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
                    <span className="font-display text-xl tracking-tight">
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
            More questions?{" "}
            <Link to="/contact" hash="faq" className="editorial-link">
              See the full FAQ
            </Link>
          </p>
        </div>
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
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-6 lg:px-12 mt-24">
      <div className="max-w-[1400px] mx-auto">
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

