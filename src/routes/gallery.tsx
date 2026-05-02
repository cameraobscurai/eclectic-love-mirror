import { createFileRoute, Link } from "@tanstack/react-router";
import { GalleryFilmstrip } from "@/components/gallery/GalleryFilmstrip";
import { galleryProjects } from "@/content/gallery-projects";

// ---------------------------------------------------------------------------
// Gallery — selected project proof, cinematic exhibition mode
//
// DARK page on purpose. The Gallery is the one cinematic moment in the site
// where filmstrip behavior, sequence, and anticipation lead the viewer.
// Compositional logic stays the same whether `galleryProjects` is empty
// (ghost frames, real rail mechanics) or populated (real cards + panel).
//
// No fake projects, no fake links, no fake captions, no stock images.
// ---------------------------------------------------------------------------

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
  return (
    <main className="min-h-screen bg-charcoal text-cream pb-32">
      {/* Hero */}
      <section
        className="px-6 lg:px-12"
        style={{
          paddingTop: "clamp(96px, 9vw, 144px)",
          paddingBottom: "clamp(48px, 5vw, 80px)",
        }}
      >
        <div className="max-w-[1600px] mx-auto">
          <p className="text-[10px] uppercase tracking-[0.3em] text-cream/45">
            THE GALLERY
          </p>
          <h1 className="mt-4 font-display text-[clamp(2.5rem,6vw,5rem)] leading-[1] uppercase tracking-[0.04em]">
            Selected Projects
          </h1>
          <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-cream/65">
            A working portfolio of weddings, meetings + incentive travel, and
            social engagements designed and produced by Eclectic Hive.
          </p>
        </div>
      </section>

      {/* Filmstrip — the page's structural heart, populated or empty. */}
      <section className="px-6 lg:px-12">
        <div className="max-w-[1600px] mx-auto">
          <div className="border-t border-cream/10 pt-10">
            <p className="text-[10px] uppercase tracking-[0.3em] text-cream/45">
              SELECTED PROJECTS
            </p>
            <GalleryFilmstrip projects={galleryProjects} />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 lg:px-12 mt-24">
        <div className="max-w-[1600px] mx-auto">
          <div className="border-t border-cream/10 pt-12">
            <p className="text-[10px] uppercase tracking-[0.3em] text-cream/45">
              BEGIN
            </p>
            <h2 className="mt-4 font-display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] uppercase tracking-[0.04em] max-w-2xl">
              Start a conversation about your project.
            </h2>
            <Link
              to="/contact"
              className="mt-8 inline-block text-xs uppercase tracking-[0.22em] border border-cream/60 text-cream px-6 py-3 hover:bg-cream hover:text-charcoal transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/40 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal"
            >
              START A CONVERSATION
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
