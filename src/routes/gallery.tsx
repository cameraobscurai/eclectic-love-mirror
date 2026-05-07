import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { GalleryHero } from "@/components/gallery/GalleryHero";
import { GalleryFilters } from "@/components/gallery/GalleryFilters";
import { GalleryFilmstrip } from "@/components/gallery/GalleryFilmstrip";
import { GalleryIndex } from "@/components/gallery/GalleryIndex";
import { GalleryCta } from "@/components/gallery/GalleryCta";
import { GalleryLightbox } from "@/components/gallery/GalleryLightbox";
import { galleryProjects, type GalleryProject } from "@/content/gallery-projects";
import pressGlassBar from "@/assets/press-glass-bar.jpg?preset=editorial";
import { STORAGE_ORIGIN } from "@/lib/storage-image";

// ---------------------------------------------------------------------------
// Gallery — editorial five-section layout per design spec.
//   1. Hero          2. Filter pills        3. Snap filmstrip
//   4. Project Index 5. CTA                 6. Press logos (existing asset)
// All imagery is real, served from the storage manifest.
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
    // Preconnect to the storage CDN so the TLS handshake happens in
    // parallel with HTML parsing — first card image starts downloading
    // ~150-300ms sooner on cold loads.
    links: STORAGE_ORIGIN
      ? [
          { rel: "preconnect", href: STORAGE_ORIGIN, crossOrigin: "anonymous" },
          { rel: "dns-prefetch", href: STORAGE_ORIGIN },
        ]
      : [],
  }),
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
  const handleOpen = (visibleIndex: number) => {
    const project = visibleProjects[visibleIndex];
    if (!project) return;
    const realIndex = galleryProjects.findIndex((p) => p.number === project.number);
    setOpenIndex(realIndex >= 0 ? realIndex : 0);
  };

  return (
    <main className="min-h-screen bg-charcoal text-cream">
      <GalleryHero total={galleryProjects.length} />

      {/* Region filters hidden for now */}

      <GalleryFilmstrip projects={visibleProjects} onOpen={handleOpen} />

      <GalleryIndex projects={visibleProjects} onOpen={handleOpen} />

      <GalleryCta />

      {/* As Featured In — existing press image */}
      <section aria-labelledby="press-heading" className="bg-cream py-20 lg:py-28 px-6 lg:px-12">
        <div className="max-w-[1400px] mx-auto">
          <h2
            id="press-heading"
            className="text-charcoal/50 text-[10px] uppercase tracking-[0.32em] text-center mb-8"
          >
            As Featured In
          </h2>
          <picture>
            {pressGlassBar.sources.avif && (
              <source type="image/avif" srcSet={pressGlassBar.sources.avif} />
            )}
            {pressGlassBar.sources.webp && (
              <source type="image/webp" srcSet={pressGlassBar.sources.webp} />
            )}
            <img
              src={pressGlassBar.img.src}
              width={pressGlassBar.img.w}
              height={pressGlassBar.img.h}
              alt="Featured in Elle, Harper's Bazaar, The Knot, Vogue, Martha Stewart Weddings, and Brides"
              className="w-full h-auto select-none"
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </picture>
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
