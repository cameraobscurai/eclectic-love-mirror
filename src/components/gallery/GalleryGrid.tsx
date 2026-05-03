import type { GalleryProject } from "@/content/gallery-projects";
import { GalleryGridCard } from "./GalleryGridCard";

// ---------------------------------------------------------------------------
// GalleryGrid
//
// Asymmetric editorial grid. Composed rhythm rather than a uniform mosaic:
//   row 1: wide(7) + tall(5)
//   row 2: tall(5) + wide(7)
//   row 3: feature(12)   ← full-bleed hero
// Pattern repeats. Mobile collapses to a single column.
// ---------------------------------------------------------------------------

interface Props {
  projects: GalleryProject[];
}

type Slot = { project: GalleryProject; variant: "wide" | "tall" | "feature"; col: string };

function compose(projects: GalleryProject[]): Slot[] {
  const slots: Slot[] = [];
  // Pattern of (variant, colSpan) groups. We consume projects as we go.
  // Each cycle is 5 projects across 3 rows.
  const cycle: Array<{ variant: Slot["variant"]; col: string }> = [
    { variant: "wide", col: "lg:col-span-7" },
    { variant: "tall", col: "lg:col-span-5" },
    { variant: "tall", col: "lg:col-span-5" },
    { variant: "wide", col: "lg:col-span-7" },
    { variant: "feature", col: "lg:col-span-12" },
  ];
  projects.forEach((project, i) => {
    const c = cycle[i % cycle.length];
    slots.push({ project, ...c });
  });
  return slots;
}

export function GalleryGrid({ projects }: Props) {
  const slots = compose(projects);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-20 lg:gap-y-28">
      {slots.map(({ project, variant, col }, i) => (
        <div key={project.slug} className={col}>
          <GalleryGridCard project={project} variant={variant} eager={i < 2} />
        </div>
      ))}
    </div>
  );
}
