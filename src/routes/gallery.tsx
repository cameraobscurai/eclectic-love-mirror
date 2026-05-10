import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { GalleryHero } from "@/components/gallery/GalleryHero";
import { GalleryFilters } from "@/components/gallery/GalleryFilters";
import { GalleryFilmstrip } from "@/components/gallery/GalleryFilmstrip";
import { GalleryIndex } from "@/components/gallery/GalleryIndex";
import { GalleryCta } from "@/components/gallery/GalleryCta";
import { GalleryLightbox } from "@/components/gallery/GalleryLightbox";
import { galleryProjects, type GalleryProject } from "@/content/gallery-projects";
import pressLogos from "@/assets/press-logos-transparent.webp";
import { STORAGE_ORIGIN, renderUrl } from "@/lib/storage-image";
import { morphOpen } from "@/lib/view-transition";
import { flushSync } from "react-dom";

// ---------------------------------------------------------------------------
// Gallery — editorial five-section layout per design spec.
//   1. Hero          2. Filter pills        3. Snap filmstrip
//   4. Project Index 5. CTA                 6. Press logos (existing asset)
// All imagery is real, served from the storage manifest.
// ---------------------------------------------------------------------------

const SITE_URL = "https://eclectichive.com";
const GALLERY_URL = `${SITE_URL}/gallery`;

export const Route = createFileRoute("/gallery")({
  head: () => {
    const ogImage = renderUrl(galleryProjects[0].heroImage.src, {
      width: 1600,
      quality: 80,
    });

    const itemListLd = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${GALLERY_URL}#gallery`,
      name: "The Gallery — Selected Projects",
      description:
        "Selected projects from Eclectic Hive — cinematic event environments designed, fabricated, and produced from Denver, Colorado.",
      url: GALLERY_URL,
      isPartOf: { "@type": "WebSite", name: "Eclectic Hive", url: SITE_URL },
      primaryImageOfPage: { "@type": "ImageObject", url: ogImage },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: galleryProjects.length,
        itemListOrder: "https://schema.org/ItemListOrderAscending",
        itemListElement: galleryProjects.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "CreativeWork",
            "@id": `${GALLERY_URL}#project-${p.number}`,
            name: p.name,
            description: p.summary,
            url: `${GALLERY_URL}#project-${p.number}`,
            image: renderUrl(p.heroImage.src, { width: 1600, quality: 80 }),
            dateCreated: p.year,
            genre: p.category,
            locationCreated: {
              "@type": "Place",
              name: p.location,
              address: { "@type": "PostalAddress", addressRegion: p.region },
              geo: {
                "@type": "GeoCoordinates",
                longitude: p.coords[0],
                latitude: p.coords[1],
              },
            },
            additionalType: p.kind,
            creator: {
              "@type": "Organization",
              name: "Eclectic Hive",
              url: SITE_URL,
            },
          },
        })),
      },
    };

    const breadcrumbLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Gallery", item: GALLERY_URL },
      ],
    };

    return {
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
        { property: "og:type", content: "website" },
        { property: "og:url", content: GALLERY_URL },
        { property: "og:image", content: ogImage },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "The Gallery — Eclectic Hive" },
        { name: "twitter:image", content: ogImage },
      ],
      links: [
        { rel: "canonical", href: GALLERY_URL },
        ...(STORAGE_ORIGIN
          ? [
              { rel: "preconnect", href: STORAGE_ORIGIN, crossOrigin: "anonymous" },
              { rel: "dns-prefetch", href: STORAGE_ORIGIN },
            ]
          : []),
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(itemListLd),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(breadcrumbLd),
        },
      ],
    };
  },
  component: GalleryPage,
});


// Stable list of regions in first-appearance order. "All" pinned first.
const REGION_FILTERS: string[] = (() => {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const p of galleryProjects) {
    if (!seen.has(p.region)) {
      seen.add(p.region);
      ordered.push(p.region);
    }
  }
  return ["All", ...ordered];
})();

function GalleryPage() {
  const [filter, setFilter] = useState<string>("All");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const visibleProjects: GalleryProject[] = useMemo(() => {
    if (filter === "All") return galleryProjects;
    return galleryProjects.filter((p) => p.region === filter);
  }, [filter]);

  const counts: Record<string, number> = useMemo(() => {
    const base: Record<string, number> = { All: galleryProjects.length };
    for (const f of REGION_FILTERS) if (f !== "All") base[f] = 0;
    for (const p of galleryProjects) base[p.region] = (base[p.region] ?? 0) + 1;
    return base;
  }, []);

  // Open lightbox at the real project index (independent of current filter view).
  const handleOpen = (visibleIndex: number, sourceEl?: HTMLElement | null) => {
    const project = visibleProjects[visibleIndex];
    if (!project) return;
    const realIndex = galleryProjects.findIndex((p) => p.number === project.number);
    const next = realIndex >= 0 ? realIndex : 0;
    morphOpen(
      sourceEl ?? null,
      () => flushSync(() => setOpenIndex(next)),
      () => document.querySelector<HTMLElement>('[data-vt-dest="gallery-hero"]'),
    );
  };

  return (
    <main className="min-h-screen bg-charcoal text-cream">
      <GalleryHero total={galleryProjects.length} />

      {/* Region filters hidden for now */}

      <GalleryFilmstrip projects={visibleProjects} onOpen={handleOpen} />

      <GalleryIndex projects={visibleProjects} onOpen={handleOpen} />

      <GalleryCta />

      {/* As Featured In — transparent press logos on charcoal.
          Width matches the CTA headline measure above for axial continuity. */}
      <section aria-labelledby="press-heading" className="bg-charcoal pb-16 lg:pb-20 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <h2
            id="press-heading"
            className="text-cream/40 text-[10px] uppercase tracking-[0.32em] text-center mb-6"
          >
            As Featured In
          </h2>
          <img
            src={pressLogos}
            alt="Featured in Elle, Harper's Bazaar, The Knot, Vogue, Martha Stewart Weddings, and Brides"
            className="w-full h-auto object-contain select-none mx-auto opacity-90"
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        </div>
      </section>

      {openIndex !== null && (
        <GalleryLightbox
          projects={galleryProjects}
          initialProjectIndex={openIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </main>
  );
}
