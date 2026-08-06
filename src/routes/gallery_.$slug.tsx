// ---------------------------------------------------------------------------
// /gallery/{slug} — per-project permalink.
//
// Renders the existing GalleryLightbox in "page mode": same cinematic view,
// but addressable, shareable, indexable, and back-button correct. PREV/NEXT
// navigate to sibling permalinks; close returns to the index.
// ---------------------------------------------------------------------------

import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";

import { GalleryLightbox } from "@/components/gallery/GalleryLightbox";
import { galleryProjects } from "@/content/gallery-projects";
import { gallerySlug } from "@/lib/gallery-orders";
import { useOrderedGalleryProjects } from "@/hooks/use-gallery-projects";
import { renderUrl, STORAGE_ORIGIN } from "@/lib/storage-image";

const SITE_URL = "https://eclectichive.com";

function findStatic(slug: string) {
  return galleryProjects.find((p) => gallerySlug(p) === slug) ?? null;
}

type Search = { plate?: number };

export const Route = createFileRoute("/gallery_/$slug")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const raw = Number(search.plate);
    return Number.isFinite(raw) && raw > 0 ? { plate: Math.floor(raw) } : {};
  },
  loader: ({ params }) => {
    const project = findStatic(params.slug);
    if (!project) throw notFound();
    return { project };
  },
  head: ({ params, loaderData }) => {
    const url = `${SITE_URL}/gallery/${params.slug}`;
    if (!loaderData) {
      return {
        meta: [
          { title: "Unavailable — Eclectic Hive" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const p = loaderData.project;
    const isStorage = p.heroImage.src.includes("/storage/v1/object/public/");
    const ogImage = isStorage
      ? renderUrl(p.heroImage.src, { width: 1600, quality: 80 })
      : null;
    const title = `${p.name} — ${p.planner} | Eclectic Hive`;
    const description =
      p.summary ||
      `${p.kind} at ${p.location}, ${p.year} — designed and produced by Eclectic Hive with ${p.planner}.`;

    const ld = {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      "@id": `${url}#project`,
      name: p.name,
      description,
      url,
      dateCreated: p.year,
      genre: p.category,
      additionalType: p.kind,
      ...(ogImage ? { image: ogImage } : {}),
      locationCreated: {
        "@type": "Place",
        name: p.location,
        address: { "@type": "PostalAddress", addressRegion: p.region },
      },
      creator: { "@type": "Organization", name: "Eclectic Hive", url: SITE_URL },
      contributor: { "@type": "Organization", name: p.planner },
    };

    const breadcrumbLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Gallery", item: `${SITE_URL}/gallery` },
        { "@type": "ListItem", position: 3, name: p.name, item: url },
      ],
    };

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: `${p.name} — Eclectic Hive` },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        ...(ogImage ? [{ property: "og:image", content: ogImage }] : []),
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: `${p.name} — Eclectic Hive` },
        ...(ogImage ? [{ name: "twitter:image", content: ogImage }] : []),
      ],
      links: [
        { rel: "canonical", href: url },
        ...(ogImage
          ? [{ rel: "preload", as: "image" as const, href: ogImage, fetchPriority: "high" as const }]
          : []),
        ...(STORAGE_ORIGIN
          ? [
              { rel: "preconnect", href: STORAGE_ORIGIN, crossOrigin: "anonymous" as const },
              { rel: "dns-prefetch", href: STORAGE_ORIGIN },
            ]
          : []),
      ],
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(ld) },
        { type: "application/ld+json", children: JSON.stringify(breadcrumbLd) },
      ],
    };
  },
  component: GalleryProjectPage,
  notFoundComponent: GalleryProjectNotFound,
});

function GalleryProjectPage() {
  const { slug } = Route.useParams();
  const { plate } = Route.useSearch();
  const navigate = useNavigate();
  const projects = useOrderedGalleryProjects();

  const index = useMemo(
    () => projects.findIndex((p) => gallerySlug(p) === slug),
    [projects, slug],
  );

  const onClose = useCallback(() => {
    navigate({ to: "/gallery" });
  }, [navigate]);

  const onProjectChange = useCallback(
    (next: number) => {
      const target = projects[next];
      if (!target) return;
      navigate({
        to: "/gallery/$slug",
        params: { slug: gallerySlug(target) },
        search: {},
      });
    },
    [navigate, projects],
  );

  const onPlateChange = useCallback(
    (i: number) => {
      navigate({
        to: "/gallery/$slug",
        params: { slug },
        search: i > 0 ? { plate: i + 1 } : {},
        replace: true,
        resetScroll: false,
      });
    },
    [navigate, slug],
  );

  if (index < 0) return <GalleryProjectNotFound />;

  const project = projects[index];
  const plateCount = Math.max(
    project.detailImages.length > 0 ? project.detailImages.length : 1,
    1,
  );
  const initialPlateIndex = plate ? Math.min(plate - 1, plateCount - 1) : 0;

  return (
    <main className="min-h-screen bg-charcoal text-cream">
      <GalleryLightbox
        key={slug}
        projects={projects}
        initialProjectIndex={index}
        initialPlateIndex={initialPlateIndex}
        onClose={onClose}
        onPlateChange={onPlateChange}
        onProjectChange={onProjectChange}
      />
    </main>
  );
}

function GalleryProjectNotFound() {
  return (
    <main className="min-h-screen bg-charcoal text-cream flex items-center justify-center px-6">
      <div className="text-center">
        <p className="text-[10px] uppercase tracking-[0.4em] text-cream/45">
          Project not found
        </p>
        <a
          href="/gallery"
          className="mt-8 inline-block text-[10px] uppercase tracking-[0.32em] text-cream/70 border-b border-cream/30 pb-1 hover:text-cream"
        >
          Back to the gallery
        </a>
      </div>
    </main>
  );
}
