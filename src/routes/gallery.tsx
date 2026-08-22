import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type CSSProperties } from "react";
import { GalleryHero } from "@/components/gallery/GalleryHero";
import { GalleryFilters } from "@/components/gallery/GalleryFilters";
import { GalleryFilmstrip } from "@/components/gallery/GalleryFilmstrip";
import { GalleryIndex } from "@/components/gallery/GalleryIndex";
import { GalleryCta } from "@/components/gallery/GalleryCta";
import { PortfolioWall } from "@/components/gallery/PortfolioWall";
import {
  galleryProjects,
  GALLERY_EXCLUDE_PLANNERS,
  GALLERY_NDA_PLANNERS,
  type GalleryProject,
} from "@/content/gallery-projects";
import pressLogos from "@/assets/press-logos-transparent.webp";
import { STORAGE_ORIGIN, renderUrl } from "@/lib/storage-image";
import { gallerySlug } from "@/lib/gallery-orders";
import { useOrderedGalleryProjects } from "@/hooks/use-gallery-projects";

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
        itemListElement: galleryProjects.map((p, i) => {
          const heroIsStorage = p.heroImage.src.includes("/storage/v1/object/public/");
          return {
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "CreativeWork",
              "@id": `${SITE_URL}/gallery/${gallerySlug(p)}#project`,
              name: p.name,
              description: p.summary,
              url: `${SITE_URL}/gallery/${gallerySlug(p)}`,
              ...(heroIsStorage
                ? { image: renderUrl(p.heroImage.src, { width: 1600, quality: 80 }) }
                : {}),
              dateCreated: p.year,
              genre: p.category,
              locationCreated: {
                "@type": "Place",
                name: p.location,
                address: { "@type": "PostalAddress", addressRegion: p.region },
                ...(p.coords[0] !== 0 || p.coords[1] !== 0
                  ? {
                      geo: {
                        "@type": "GeoCoordinates",
                        longitude: p.coords[0],
                        latitude: p.coords[1],
                      },
                    }
                  : {}),
              },
              additionalType: p.kind,
              creator: {
                "@type": "Organization",
                name: "Eclectic Hive",
                url: SITE_URL,
              },
              contributor: {
                "@type": "Organization",
                name: p.planner,
              },
            },
          };
        }),
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
          content: "Selected projects from Eclectic Hive — cinematic event environments.",
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
        // Preload the LCP hero (same URL as og:image, already computed above).
        {
          rel: "preload",
          as: "image" as const,
          href: ogImage,
          fetchPriority: "high" as const,
        },
        ...(STORAGE_ORIGIN
          ? [
              { rel: "preconnect", href: STORAGE_ORIGIN, crossOrigin: "anonymous" as const },
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
  const navigate = useNavigate();

  // Static content + admin plate-order overrides (baked floor, live snapshot
  // layered on when published). Shared with /gallery/{slug}.
  const overriddenProjects = useOrderedGalleryProjects();

  const visibleProjects: GalleryProject[] = useMemo(() => {
    if (filter === "All") return overriddenProjects;
    return overriddenProjects.filter((p) => p.region === filter);
  }, [filter, overriddenProjects]);

  const counts: Record<string, number> = useMemo(() => {
    const base: Record<string, number> = { All: overriddenProjects.length };
    for (const f of REGION_FILTERS) if (f !== "All") base[f] = 0;
    for (const p of overriddenProjects) base[p.region] = (base[p.region] ?? 0) + 1;
    return base;
  }, [overriddenProjects]);

  // Projects are real pages now — open = navigate to the permalink.
  const handleOpen = (visibleIndex: number) => {
    const project = visibleProjects[visibleIndex];
    if (!project) return;
    navigate({
      to: "/gallery/$slug",
      params: { slug: gallerySlug(project) },
      search: {},
    });
  };

  return (
    <main className="min-h-screen bg-charcoal text-cream">
      <GalleryHero total={overriddenProjects.length} />

      {/* Region filters hidden for now */}

      <GalleryFilmstrip projects={visibleProjects} onOpen={handleOpen} />

      <GalleryIndex projects={visibleProjects} onOpen={handleOpen} />

      {/* Crawlable permalinks — the filmstrip/index rows are buttons, so this
          gives crawlers a real href to every project page. */}
      <nav aria-label="All projects" className="sr-only">
        <ul>
          {overriddenProjects.map((p) => (
            <li key={p.number}>
              <Link to="/gallery/$slug" params={{ slug: gallerySlug(p) }}>
                {p.name} — {p.planner}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Secondary gallery — every plate across every project, interleaved.
          The wall recedes and the CTA emerges across the same seam (CSS
          scroll-driven; see .seam-recede / .seam-emerge in styles.css). */}
      <div className="seam-recede">
        <PortfolioWall projects={visibleProjects} />
      </div>

      {/* Closing sequence — stacked panels. Each pins to the top and the next
          slides over it, the covered card settling back in Z (scale + dim).
          Pure CSS scroll-driven; falls back to plain stacked sections where
          view() timelines or reduced-motion say no. See .stack-* in styles.css. */}
      <div className="stack-seq">
        <div className="stack-card" style={{ "--i": 0 } as CSSProperties}>
          <div className="stack-card-pin">
            <div className="stack-card-face seam-emerge">
              <GalleryCta />
            </div>
          </div>
        </div>

        {/* In partnership with — planner rolodex (ticker), trade-proof bridge to venues */}
        <div className="stack-card" style={{ "--i": 1 } as CSSProperties}>
          <div className="stack-card-pin">
            <div className="stack-card-face">
              <PartnerTicker />
            </div>
          </div>
        </div>

        {/* Delivered to — venue index (derived from gallery project locations) */}
        <div className="stack-card" style={{ "--i": 2 } as CSSProperties}>
          <div className="stack-card-pin">
            <div className="stack-card-face">
              <VenueIndex projects={overriddenProjects} />
            </div>
          </div>
        </div>

        {/* As Featured In — transparent press logos on charcoal.
            Width matches the CTA headline measure above for axial continuity. */}
        <div className="stack-card stack-card--last" style={{ "--i": 3 } as CSSProperties}>
          <div className="stack-card-pin">
            <div className="stack-card-face">
              <section
                aria-labelledby="press-heading"
                className="bg-charcoal pt-10 lg:pt-12 pb-16 lg:pb-20 px-6 lg:px-12"
              >
                <div className="max-w-[1600px] mx-auto">
                  <h2
                    id="press-heading"
                    className="text-cream/40 text-[10px] uppercase tracking-[0.32em] text-center mb-6"
                  >
                    AS FEATURED IN
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
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// Shared marquee — single keyframe set, direction flips via reverse animation.
function CreditMarquee({
  eyebrow,
  items,
  direction = "left",
  headingId,
}: {
  eyebrow: string;
  items: string[];
  direction?: "left" | "right";
  headingId: string;
}) {
  if (items.length === 0) return null;
  const animation =
    direction === "left"
      ? "animate-[credit-marquee_60s_linear_infinite]"
      : "animate-[credit-marquee_60s_linear_infinite_reverse]";
  return (
    <section aria-labelledby={headingId} className="bg-charcoal px-6 lg:px-12 py-10 lg:py-16">
      <div className="max-w-[1600px] mx-auto">
        <h2
          id={headingId}
          className="text-cream/40 text-[10px] uppercase tracking-[0.32em] text-center mb-5"
        >
          {eyebrow}
        </h2>
        <div
          className="group relative -mx-6 overflow-hidden md:-mx-12"
          aria-label={eyebrow}
          style={{
            maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
          }}
        >
          <div
            className={`flex w-max ${animation} group-hover:[animation-play-state:paused] motion-reduce:animate-none`}
          >
            {[0, 1].map((dup) => (
              <ul
                key={dup}
                aria-hidden={dup === 1}
                className="flex shrink-0 items-center gap-x-10 pr-10 text-[11px] uppercase tracking-[0.32em] text-cream/70"
              >
                {items.map((name) => (
                  <li
                    key={`${dup}-${name}`}
                    className="flex items-center gap-x-10 whitespace-nowrap"
                  >
                    <span>{name}</span>
                    <span aria-hidden className="text-cream/25">
                      ·
                    </span>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Venue ticker — right-to-left direction, complements the planner ticker.
function VenueIndex({ projects }: { projects: GalleryProject[] }) {
  const venues = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const p of projects) {
      const short = (p.location.split("—")[0].split(",")[0] ?? "").trim().toUpperCase();
      if (!short || seen.has(short)) continue;
      seen.add(short);
      out.push(short);
    }
    return out;
  }, [projects]);

  return (
    <CreditMarquee
      eyebrow="DELIVERED TO"
      items={venues}
      direction="right"
      headingId="venue-index-heading"
    />
  );
}

// Planner ticker — left-to-right, same source-of-truth as /atelier.
function PartnerTicker() {
  const partners = useMemo(() => {
    const excluded = new Set<string>([
      ...GALLERY_EXCLUDE_PLANNERS.map((p) => p.toUpperCase()),
      ...GALLERY_NDA_PLANNERS.map((p) => p.toUpperCase()),
    ]);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const p of galleryProjects) {
      const name = p.planner.trim().toUpperCase();
      if (!name || seen.has(name)) continue;
      if ([...excluded].some((ex) => name.includes(ex))) continue;
      seen.add(name);
      out.push(name);
    }
    return out.sort((a, b) => a.localeCompare(b));
  }, []);

  return (
    <>
      <CreditMarquee
        eyebrow="IN PARTNERSHIP WITH"
        items={partners}
        direction="left"
        headingId="partner-ticker-heading"
      />
      <style>{`
        @keyframes credit-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </>
  );
}
