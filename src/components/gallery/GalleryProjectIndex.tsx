import type { GalleryProject } from "@/content/gallery-projects";

// ---------------------------------------------------------------------------
// GalleryProjectIndex
//
// Flat horizontal index strip below the cards track. Clicking a row jumps
// the track to that card and (optionally) opens the lightbox.
// ---------------------------------------------------------------------------

interface GalleryProjectIndexProps {
  projects: GalleryProject[];
  activeIndex: number;
  onJump: (index: number) => void;
}

export function GalleryProjectIndex({
  projects,
  activeIndex,
  onJump,
}: GalleryProjectIndexProps) {
  return (
    <div className="mt-16 border-t border-cream/10 pt-6">
      <p className="text-[10px] uppercase tracking-[0.3em] text-cream/45">
        Project Index
      </p>
      <ol className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
        {projects.map((p, i) => {
          const isActive = i === activeIndex;
          return (
            <li key={p.number}>
              <button
                type="button"
                onClick={() => onJump(i)}
                className={[
                  "group inline-flex items-baseline gap-3 text-[11px] uppercase tracking-[0.22em] transition-colors",
                  "focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/40",
                  isActive ? "text-cream" : "text-cream/55 hover:text-cream",
                ].join(" ")}
              >
                <span className="tabular-nums text-cream/40 group-hover:text-cream/70">
                  {p.number}
                </span>
                <span className="font-display normal-case tracking-normal text-[15px]">
                  {p.name}
                </span>
                <span className="text-cream/35">·</span>
                <span>{p.kind}</span>
                <span className="text-cream/35">·</span>
                <span className="tabular-nums text-cream/45">{p.year}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
