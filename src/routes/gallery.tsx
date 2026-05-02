import { createFileRoute, Link } from "@tanstack/react-router";
import { MediaAperture } from "@/components/media-aperture";

// ---------------------------------------------------------------------------
// Gallery — selected project proof
//
// Layout-first. Real project media later. No fake bridge content.
// When the owner provides real entries, populate PROJECTS below. The same
// array drives both the editorial section and (later) a project index table.
// ---------------------------------------------------------------------------

type GalleryCategory =
  | "Luxury Weddings"
  | "Meetings + Incentive Travel"
  | "Social + Non-Profit";

interface GalleryImage {
  src: string;
  alt: string;
}

interface GalleryProject {
  number: string; // "01"
  name: string;
  location: string;
  year: string;
  category: GalleryCategory;
  heroImage: GalleryImage;
  detailImages: GalleryImage[];
  /** Only set when a real subroute exists. */
  href?: string;
  /** One short paragraph about the project. Optional. */
  note?: string;
}

const PROJECTS: GalleryProject[] = [];

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "The Gallery — Selected Projects | Eclectic Hive" },
      {
        name: "description",
        content:
          "Selected projects from Eclectic Hive — cinematic event environments designed, fabricated, and produced from Denver, Colorado.",
      },
      { property: "og:title", content: "The Gallery — Eclectic Hive" },
      {
        property: "og:description",
        content:
          "Selected projects from Eclectic Hive — cinematic event environments.",
      },
    ],
  }),
  component: GalleryPage,
});

function GalleryPage() {
  const hasProjects = PROJECTS.length > 0;

  return (
    <main className="min-h-screen bg-cream text-charcoal pb-32">
      {/* Hero */}
      <section
        className="px-6 lg:px-12"
        style={{
          paddingTop: "clamp(64px, 7vw, 112px)",
          paddingBottom: "clamp(48px, 5vw, 80px)",
        }}
      >
        <div className="max-w-[1400px] mx-auto">
          <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/50">
            The Gallery
          </p>
          <h1 className="mt-4 font-display text-[clamp(2.5rem,6vw,5rem)] leading-[1] tracking-tight">
            Selected Projects
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-charcoal/70">
            A working portfolio of weddings, meetings + incentive travel, and
            social engagements designed and produced by Eclectic Hive.
          </p>
        </div>
      </section>

      {/* Selected Projects */}
      <section className="px-6 lg:px-12">
        <div className="max-w-[1400px] mx-auto">
          <div
            className="border-t pt-10"
            style={{ borderColor: "var(--archive-rule)" }}
          >
            <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/50">
              Selected Projects
            </p>

            {hasProjects ? (
              <ol className="mt-12 space-y-24">
                {PROJECTS.map((p) => (
                  <ProjectEntry key={p.number} project={p} />
                ))}
              </ol>
            ) : (
              <PendingProjectsLayout />
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 lg:px-12 mt-24">
        <div className="max-w-[1400px] mx-auto">
          <div
            className="border-t pt-12"
            style={{ borderColor: "var(--archive-rule)" }}
          >
            <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/50">
              Begin
            </p>
            <h2 className="mt-4 font-display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] tracking-tight max-w-2xl">
              Start a conversation about your project.
            </h2>
            <Link
              to="/contact"
              className="mt-8 inline-block text-xs uppercase tracking-[0.22em] border border-charcoal px-6 py-3 hover:bg-charcoal hover:text-cream transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
            >
              Contact the studio
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

// ---------------------------------------------------------------------------
// PendingProjectsLayout
//
// Renders the editorial selected-projects rhythm with empty media apertures
// while real project assets are being prepared. Two numbered "project slots"
// prove the layout: hero aperture + 5 detail apertures each. No fake names,
// no fake links, no stock images. Single quiet line of copy.
// ---------------------------------------------------------------------------
function PendingProjectsLayout() {
  return (
    <div className="mt-12">
      <p className="font-display italic text-xl md:text-2xl text-charcoal/55 max-w-xl">
        Selected projects are being prepared.
      </p>

      <div className="mt-16 space-y-24">
        {["01", "02"].map((n) => (
          <div key={n}>
            <div className="flex items-baseline gap-6 mb-8">
              <span className="font-display text-2xl text-charcoal/35 tabular-nums">
                {n}
              </span>
              <div className="flex-1 border-t border-charcoal/10" />
            </div>

            {/* Hero aperture */}
            <MediaAperture ratio="3/2" />

            {/* Detail strip — 5 small apertures, mirrors real project rhythm */}
            <div className="mt-3 grid grid-cols-3 sm:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <MediaAperture key={i} ratio="1/1" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectEntry({ project }: { project: GalleryProject }) {
  const body = (
    <>
      <h3 className="font-display text-[clamp(1.75rem,3.5vw,2.75rem)] leading-[1.05] tracking-tight">
        {project.name}
      </h3>

      {/* Hero image */}
      <div className="mt-8 bg-white">
        <img
          src={project.heroImage.src}
          alt={project.heroImage.alt}
          loading="lazy"
          decoding="async"
          className="w-full h-auto object-cover"
        />
      </div>

      {/* Detail strip 01–07 style */}
      {project.detailImages.length > 0 && (
        <div className="mt-6 grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-2">
          {project.detailImages.slice(0, 7).map((img, i) => (
            <div key={i} className="aspect-square bg-white overflow-hidden">
              <img
                src={img.src}
                alt={img.alt}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {project.note && (
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-charcoal/70">
          {project.note}
        </p>
      )}
    </>
  );

  return (
    <li>
      <div className="flex items-baseline gap-6 mb-6">
        <span className="font-display text-2xl text-charcoal/45 tabular-nums">
          {project.number}
        </span>
        <div className="flex-1 border-t border-charcoal/15" />
        <span className="text-[10px] uppercase tracking-[0.25em] text-charcoal/55">
          {project.location} · {project.year}
        </span>
      </div>

      {project.href ? (
        <Link to={project.href} className="group block">
          {body}
        </Link>
      ) : (
        <div className="block">{body}</div>
      )}
    </li>
  );
}
