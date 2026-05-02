import { createFileRoute, Link } from "@tanstack/react-router";
import { MediaAperture } from "@/components/media-aperture";

// ---------------------------------------------------------------------------
// Atelier by The Hive — operational proof page
//
// Six sections: Hero · The Team · The Creative Space · Scope + Fabrication
// · Atelier Approach · CTA. No FAQ on this page. No fake portraits, no fake
// roster rows, no stock studio shots. Empty arrays render text-only blocks.
// ---------------------------------------------------------------------------

interface TeamMember {
  name: string;
  role: string;
  portraitSrc?: string;
}

interface SpaceImage {
  src: string;
  alt: string;
}

const TEAM: TeamMember[] = [];
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
          "Atelier by The Hive: a design and fabrication studio for cinematic event environments. Imagined. Refined. Crafted.",
      },
      {
        property: "og:title",
        content: "Atelier by The Hive — Eclectic Hive",
      },
      {
        property: "og:description",
        content: "Imagined. Refined. Crafted. Design + fabrication studio.",
      },
    ],
  }),
  component: AtelierPage,
});

function AtelierPage() {
  return (
    <main className="min-h-screen bg-cream text-charcoal pb-32">
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
              Refined.
              <br />
              Crafted.
            </h1>
            <p className="mt-8 max-w-2xl text-base leading-relaxed text-charcoal/70">
              A working studio for design, fabrication, and production. Every
              object on a guest's table — every chair, lamp, drape, and bar — is
              chosen, made, or finished here before it leaves the warehouse.
            </p>
          </div>
          <div className="md:col-span-5">
            <MediaAperture ratio="4/5" />
          </div>
        </div>
      </section>

      {/* 2. THE TEAM */}
      <Section eyebrow="The Team">
        <div className="grid md:grid-cols-12 gap-10">
          <p className="md:col-span-5 font-display italic text-2xl md:text-3xl leading-[1.2] text-charcoal/80">
            Professional, precise, and approachable.
          </p>
          <div className="md:col-span-7 space-y-5 text-base leading-relaxed text-charcoal/70">
            <p>
              The Atelier is a small team of designers, fabricators, and
              producers working under a single roof in Denver. Each project is
              led by a designer who stays with it from concept through install.
            </p>
            <p>
              Personality is welcome. The studio is rigorous about craft and
              relaxed about everything else.
            </p>
          </div>
        </div>

        {TEAM.length > 0 ? (
          <ul className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
            {TEAM.map((member) => (
              <li key={member.name}>
                {member.portraitSrc && (
                  <div className="aspect-[4/5] bg-white overflow-hidden grayscale">
                    <img
                      src={member.portraitSrc}
                      alt={`Portrait of ${member.name}`}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <p className="mt-4 font-display text-xl">{member.name}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-charcoal/55">
                  {member.role}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          // Empty-state: portrait apertures, no fake names, no fake roles.
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
            {Array.from({ length: 3 }).map((_, i) => (
              <MediaAperture key={i} ratio="4/5" />
            ))}
          </div>
        )}
      </Section>

      {/* 3. THE CREATIVE SPACE */}
      <Section eyebrow="The Creative Space">
        <div className="grid md:grid-cols-12 gap-10">
          <p className="md:col-span-5 font-display italic text-2xl md:text-3xl leading-[1.2] text-charcoal/80">
            Studio, workbench, warehouse.
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

      {/* 4. SCOPE + FABRICATION — capability evidence, not a services list. */}
      <Section eyebrow="Scope + Fabrication">
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
            label="REFINED"
            body="Material exploration, scale studies, and revisions. The proposal tightens until every detail earns its place."
          />
          <ApproachStep
            number="03"
            label="CRAFTED"
            body="Fabrication, finishing, and on-site install. The Atelier stays with the project from first sketch to final strike."
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
      <p className="font-display text-2xl text-charcoal/45 tabular-nums">
        {number}
      </p>
      <h3 className="mt-3 font-display text-3xl uppercase tracking-[0.06em]">{label}</h3>
      <p className="mt-4 text-[15px] leading-relaxed text-charcoal/70">
        {body}
      </p>
    </div>
  );
}
