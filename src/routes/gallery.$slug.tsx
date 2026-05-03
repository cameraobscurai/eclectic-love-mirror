import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  galleryProjects,
  getProjectBySlug,
  type GalleryProject,
} from "@/content/gallery-projects";
import { GalleryProjectSpread } from "@/components/gallery/GalleryProjectSpread";
import { GalleryNextProject } from "@/components/gallery/GalleryNextProject";

// ---------------------------------------------------------------------------
// Gallery — single project spread (/gallery/$slug)
//
// Editorial magazine treatment. Cover plate, lede, rule-driven sequence
// of full-bleeds / diptychs / triptychs / quote / detail strips, then a
// "next environment" full-bleed teaser. Vertical scroll, mouse-friendly.
// ---------------------------------------------------------------------------

export const Route = createFileRoute("/gallery/$slug")({
  loader: ({ params }) => {
    const project = getProjectBySlug(params.slug);
    if (!project) throw notFound();
    return { project };
  },
  head: ({ loaderData }) => {
    const project = loaderData?.project;
    if (!project) {
      return {
        meta: [{ title: "Environment Not Found — Eclectic Hive" }],
      };
    }
    const title = `${project.name} — ${project.location} | Eclectic Hive`;
    return {
      meta: [
        { title },
        { name: "description", content: project.summary },
        { property: "og:title", content: title },
        { property: "og:description", content: project.summary },
        { property: "og:image", content: project.heroImage.src },
        { property: "twitter:image", content: project.heroImage.src },
      ],
    };
  },
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <main className="min-h-screen bg-charcoal text-cream flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <p className="text-[10px] uppercase tracking-[0.3em] text-cream/45">Error</p>
          <h1 className="mt-4 font-display text-3xl">{error.message}</h1>
          <div className="mt-8 flex gap-4 justify-center text-[10px] uppercase tracking-[0.28em]">
            <button
              onClick={() => { router.invalidate(); reset(); }}
              className="border border-cream/60 px-5 py-3 hover:bg-cream hover:text-charcoal transition-colors"
            >
              Retry
            </button>
            <Link
              to="/gallery"
              className="border border-cream/60 px-5 py-3 hover:bg-cream hover:text-charcoal transition-colors"
            >
              Back to Gallery
            </Link>
          </div>
        </div>
      </main>
    );
  },
  notFoundComponent: () => {
    const { slug } = Route.useParams();
    return (
      <main className="min-h-screen bg-charcoal text-cream flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <p className="text-[10px] uppercase tracking-[0.3em] text-cream/45">404</p>
          <h1 className="mt-4 font-display text-3xl">No environment named “{slug}”</h1>
          <Link
            to="/gallery"
            className="mt-8 inline-block border border-cream/60 px-5 py-3 text-[10px] uppercase tracking-[0.28em] hover:bg-cream hover:text-charcoal transition-colors"
          >
            Back to Gallery
          </Link>
        </div>
      </main>
    );
  },
  component: ProjectSpreadPage,
});

function ProjectSpreadPage() {
  const { project } = Route.useLoaderData();

  // Sister-project nav: order follows the gallery list, wraps at the end.
  const idx = galleryProjects.findIndex((p) => p.slug === project.slug);
  const nextProject: GalleryProject =
    galleryProjects[(idx + 1) % galleryProjects.length];
  const prevProject: GalleryProject =
    galleryProjects[(idx - 1 + galleryProjects.length) % galleryProjects.length];

  // Reset scroll on slug change in case scrollRestoration keeps an offset.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [project.slug]);

  return (
    <main className="min-h-screen bg-charcoal text-cream pb-0">
      {/* Sticky thin masthead */}
      <div
        className="sticky z-30 bg-charcoal/85 backdrop-blur-md border-b border-cream/10"
        style={{ top: "var(--nav-h)" }}
      >
        <div className="max-w-[1600px] mx-auto px-6 lg:px-12 py-3 flex items-center justify-between gap-6 text-[10px] uppercase tracking-[0.28em] text-cream/65">
          <Link
            to="/gallery"
            className="hover:text-cream transition-colors flex items-center gap-2"
          >
            <span aria-hidden>←</span> Gallery
          </Link>
          <span className="hidden md:inline truncate">
            <span className="text-cream/45">{project.number}</span>
            <span className="mx-3 text-cream/25">/</span>
            <span className="text-cream">{project.name}</span>
          </span>
          <div className="flex items-center gap-5">
            <Link
              to="/gallery/$slug"
              params={{ slug: prevProject.slug }}
              className="hidden md:inline hover:text-cream transition-colors"
            >
              ← Prev
            </Link>
            <Link
              to="/gallery/$slug"
              params={{ slug: nextProject.slug }}
              className="hover:text-cream transition-colors"
            >
              Next →
            </Link>
          </div>
        </div>
      </div>

      <div style={{ paddingTop: "var(--nav-h)" }} />

      <GalleryProjectSpread project={project} />

      {/* Closing — next project teaser */}
      <section className="mt-24 lg:mt-40">
        <GalleryNextProject next={nextProject} />
      </section>
    </main>
  );
}
