import { createFileRoute, Link } from "@tanstack/react-router";
import { MediaAperture } from "@/components/media-aperture";
import { AtelierTeam } from "@/components/atelier/team";
import { HeroImage, heroPreloadLink } from "@/components/hero-image";
import atelierHero from "@/assets/atelier-hero.png?preset=hero";

// ---------------------------------------------------------------------------
// Atelier by The Hive — operational proof page
//
// Six sections in fixed order:
//   1. Hero
//   2. THE TEAM       (real staff module — names + roles + portrait apertures)
//   3. The Creative Space
//   4. Scope + Fabrication
//   5. Atelier Approach (Imagined · Refined · Crafted)
//   6. CTA
//
// No FAQ here. No fake portraits, no stock studio shots. Empty arrays render
// designed apertures, not blank space.
// ---------------------------------------------------------------------------

interface SpaceImage {
  src: string;
  alt: string;
}

const SPACE_IMAGES: SpaceImage[] = [];

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
  return (
    <main
      className="min-h-screen bg-cream text-charcoal pb-32"
      style={{ paddingTop: "var(--nav-h)" }}
    >
      {/* 1. HERO — type + spatial aperture. The aperture is a future hero
          image slot (studio / hands / materials), not decoration. */}
      <section
        className="px-6 lg:px-12"
        style={{
          paddingTop: "clamp(64px, 7vw, 112px)",
          paddingBottom: "clamp(48px, 5vw, 80px)",
        }}
      >
        <div className="max-w-[1400px] mx-auto grid md:grid-cols-12 gap-10 md:gap-12 items-end">
          <div className="md:col-span-7">
            <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/50">
              ATELIER BY THE HIVE
            </p>
            <h1 className="mt-4 font-display text-[clamp(2.75rem,7vw,6rem)] leading-[0.95] uppercase tracking-[0.04em]">
              Imagined.
              <br />
              Designed.
              <br />
              Realized.
            </h1>
            <p className="mt-8 max-w-2xl text-base leading-relaxed text-charcoal/70">
              We are designers, producers, and a fabrication house. The atelier
              is where design authorship, material exploration, and fabrication
              converge — through process and intention.
            </p>
          </div>
          <div className="md:col-span-5">
            {/* Section-1 hero. First production use of the imagetools +
                HeroImage pipeline — see vite.config.ts and
                src/components/hero-image.tsx. The frame is locked to 4/5 so
                the layout doesn't shift before decode. */}
            <div className="relative w-full overflow-hidden" style={{ aspectRatio: "4/5" }}>
              <HeroImage
                source={atelierHero}
                alt="Atelier moodboard — figure study and material swatches behind glass."
                focalPoint={{ x: 50, y: 45 }}
                scrim="none"
                priority
                sizes="(min-width: 768px) 40vw, 100vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. THE HIVE — real staff module. Always renders, even before
          portraits exist. See src/components/atelier/team.tsx for the data
          model and the public-render gate. */}
      <Section eyebrow="02 — The Hive">
        <AtelierTeam />
      </Section>

      {/* 3. THE ARTIST'S STUDIO */}
      <Section eyebrow="The Artist's Studio">
        <div className="grid md:grid-cols-12 gap-10">
          <p className="md:col-span-5 font-display italic text-2xl md:text-3xl leading-[1.2] text-charcoal/80">
            Studio. Workbench. Warehouse.
          </p>
          <div className="md:col-span-7 space-y-5 text-base leading-relaxed text-charcoal/70">
            <p>
              The studio is a creative work hub: a design floor for sketching
              and CAD, a fabrication bay for building, and a warehouse where
              the inventory lives between events.
            </p>
            <p>
              Material exploration happens at the table. Fabrication happens at
              the bench. Logistics happen at the dock.
            </p>
          </div>
        </div>

        {/* Wide landscape aperture + two detail apertures. Real categories
            only — no fake captions. Labels render below each frame. */}
        {SPACE_IMAGES.length > 0 ? (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-3">
            {SPACE_IMAGES.slice(0, 3).map((img, i) => (
              <div
                key={i}
                className="aspect-[4/5] bg-white overflow-hidden"
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="mt-12">
              <MediaAperture ratio="16/9" label="STUDIO" />
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <MediaAperture ratio="4/5" label="WORKBENCH" />
              <MediaAperture ratio="4/5" label="WAREHOUSE" />
            </div>
          </>
        )}
      </Section>

      {/* 4. THE FABRICATION — capability evidence, not a services list. */}
      <Section eyebrow="The Fabrication">
        <div className="grid md:grid-cols-12 gap-10">
          <div className="md:col-span-5 space-y-5 text-base leading-relaxed text-charcoal/70">
            <p>
              Eclectic Hive is a full-service design and production house.
              Clients engage the Atelier for any combination of design,
              fabrication, inventory rental, and on-site production.
            </p>
            <p>
              Custom pieces are designed in-house, built in-house, and finished
              in-house — sketches to swatches to staging.
            </p>
          </div>
          <ul
            className="md:col-span-7 divide-y"
            style={{ borderColor: "var(--archive-rule)" }}
          >
            {CAPABILITIES.map((item, i) => (
              <li
                key={item}
                className="py-4 text-[13px] tracking-[0.18em] uppercase text-charcoal/85 flex items-baseline gap-6 border-t first:border-t-0"
                style={{ borderColor: "var(--archive-rule)" }}
              >
                <span className="text-[10px] tracking-[0.22em] text-charcoal/40 tabular-nums w-8">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Material board: fabric swatch · sketch · material detail. Designed
            empty frames — no fake images, no captions. */}
        <div className="mt-12 grid grid-cols-3 gap-3">
          <MediaAperture ratio="1/1" />
          <MediaAperture ratio="1/1" />
          <MediaAperture ratio="1/1" />
        </div>
      </Section>

      {/* 5. ATELIER APPROACH triptych */}
      <Section eyebrow="Atelier Approach">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6">
          <ApproachStep
            number="01"
            label="IMAGINED"
            body="A cinematic concept rooted in the client's story — proposed as a Style Guide before a single object is sourced."
          />
          <ApproachStep
            number="02"
            label="DESIGNED"
            body="Material exploration, scale studies, and revisions. The proposal tightens until every detail earns its place."
          />
          <ApproachStep
            number="03"
            label="REALIZED"
            body="Fabrication, finishing, and on-site install. The atelier stays with the project from first sketch to final strike."
          />
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
            <h2 className="mt-4 font-display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] tracking-tight max-w-2xl">
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

function ApproachStep({
  number,
  label,
  body,
}: {
  number: string;
  label: string;
  body: string;
}) {
  return (
    <div>
      <MediaAperture ratio="3/4" />
      <p
        className="mt-6 pt-4 font-display text-2xl text-charcoal/45 tabular-nums border-t"
        style={{ borderColor: "var(--archive-rule)" }}
      >
        {number}
      </p>
      <h3 className="mt-3 font-display text-3xl uppercase tracking-[0.06em]">
        {label}
      </h3>
      <p className="mt-4 text-[15px] leading-relaxed text-charcoal/70">
        {body}
      </p>
    </div>
  );
}
