import type { GalleryProject } from "@/content/gallery-projects";

interface GalleryIndexProps {
  projects: GalleryProject[];
  onOpen: (index: number) => void;
}

export function GalleryIndex({ projects, onOpen }: GalleryIndexProps) {
  return (
    <section aria-labelledby="gallery-index-heading" className="bg-cream/5 py-16 lg:py-24 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        <h2
          id="gallery-index-heading"
          className="text-cream/40 text-xs uppercase tracking-[0.3em] mb-12"
        >
          Project Index
        </h2>
        <ul>
          {projects.map((p, i) => (
            <li key={p.number}>
              <button
                type="button"
                onClick={() => onOpen(i)}
                className="w-full group py-6 border-b border-cream/10 flex items-center gap-6 lg:gap-12 text-left hover:bg-cream/5 transition-colors px-4 -mx-4 focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/40"
              >
                <span className="text-cream/30 text-sm tracking-[0.18em] w-8 shrink-0 tabular-nums">
                  {p.number}
                </span>
                <span className="font-display text-xl lg:text-2xl text-cream font-light flex-1 group-hover:text-sand transition-colors">
                  {p.name}
                </span>
                </span>
                <span className="text-cream/30 text-sm w-16 text-right tabular-nums">
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
          ))}
        </ul>
      </div>
    </section>
  );
}
