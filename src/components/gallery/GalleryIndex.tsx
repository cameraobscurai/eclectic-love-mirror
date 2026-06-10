import type { GalleryProject } from "@/content/gallery-projects";

interface GalleryIndexProps {
  projects: GalleryProject[];
  onOpen: (index: number) => void;
}

export function GalleryIndex({ projects, onOpen }: GalleryIndexProps) {
  return (
    <section aria-labelledby="gallery-index-heading" className="bg-cream/5 py-12 lg:py-16 px-6 lg:px-12">
      <div className="max-w-[1600px] mx-auto">
        <h2
          id="gallery-index-heading"
          className="text-cream/40 text-xs uppercase tracking-[0.3em] mb-12"
        >
          Project Index
        </h2>
        <ul>
          {projects.map((p, i) => {
            const pending = !!p.pending;
            return (
              <li key={p.number}>
                <button
                  type="button"
                  onClick={() => onOpen(i)}
                  className="w-full group py-6 border-b border-cream/10 flex items-center gap-6 lg:gap-12 text-left hover:bg-cream/5 transition-colors px-4 -mx-4 focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/40"
                >
                  <span className="text-cream/30 text-sm tracking-[0.18em] w-8 shrink-0 tabular-nums">
                    {p.number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.32em] text-cream/40 truncate">
                      {p.planner}
                    </p>
                    <p className="mt-1 font-display text-xl lg:text-2xl text-cream font-light group-hover:text-sand transition-colors truncate">
                      {p.name}
                    </p>
                  </div>
                  {pending && (
                    <span className="hidden sm:inline-block text-[9px] uppercase tracking-[0.32em] text-cream/35 shrink-0">
                      Arriving
                    </span>
                  )}
                  <span className="text-cream/30 text-sm w-16 text-right tabular-nums shrink-0">
                    {p.year}
                  </span>
                  <span
                    aria-hidden
                    className="text-cream/30 group-hover:text-sand group-hover:translate-x-1 transition-all"
                  >
                    →
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
