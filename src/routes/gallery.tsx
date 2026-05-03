import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { GalleryMasthead, type CategoryFilter } from "@/components/gallery/GalleryMasthead";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import {
  galleryProjects,
  type GalleryCategory,
  type GalleryProject,
} from "@/content/gallery-projects";

// ---------------------------------------------------------------------------
// Gallery index — editorial magazine grid
//
// Quiet, scannable overview of all environments. Asymmetric 12-col grid
// (wide/tall pair, then a feature row), each card hover-cycles a few plates
// to hint at the project's range. Clicking a card opens its dedicated
// spread at /gallery/$slug.
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

const ALL_CATEGORIES: GalleryCategory[] = [
  "Luxury Weddings",
  "Meetings + Incentive Travel",
  "Social + Non-Profit",
];

function GalleryPage() {
  const [filter, setFilter] = useState<CategoryFilter>("All");

  const visibleProjects: GalleryProject[] = useMemo(() => {
    if (filter === "All") return galleryProjects;
    return galleryProjects.filter((p) => p.category === filter);
  }, [filter]);

  const counts: Record<CategoryFilter, number> = useMemo(() => {
    const base: Record<CategoryFilter, number> = {
      All: galleryProjects.length,
      "Luxury Weddings": 0,
      "Meetings + Incentive Travel": 0,
      "Social + Non-Profit": 0,
    };
    for (const p of galleryProjects) base[p.category] += 1;
    for (const c of ALL_CATEGORIES) base[c] = base[c] ?? 0;
    return base;
  }, []);

  return (
    <main
      className="min-h-screen bg-charcoal text-cream pb-32"
      style={{ paddingTop: "var(--nav-h)" }}
    >
      <GalleryMasthead
        total={galleryProjects.length}
        visibleCount={visibleProjects.length}
        active={filter}
        counts={counts}
        onChange={setFilter}
      />

      <section className="px-6 lg:px-12">
        <div className="max-w-[1600px] mx-auto">
          <GalleryGrid projects={visibleProjects} />
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 lg:px-12 mt-32">
        <div className="max-w-[1600px] mx-auto">
          <div className="border-t border-cream/10 pt-14">
            <p className="text-[10px] uppercase tracking-[0.3em] text-cream/45">
              YOUR PROJECT
            </p>
            <h2 className="mt-4 font-display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] tracking-[-0.005em] max-w-2xl">
              Ready to add your environment to our archive?
            </h2>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-cream/65">
              Every project in our portfolio represents a client who trusted us to
              author something extraordinary. We welcome conversations about how
              we can create your next environment.
            </p>
            <Link
              to="/contact"
              className="mt-8 inline-block text-[10px] uppercase tracking-[0.28em] border border-cream/60 text-cream px-6 py-3 hover:bg-cream hover:text-charcoal transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/40 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal"
            >
              START AN INQUIRY
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
