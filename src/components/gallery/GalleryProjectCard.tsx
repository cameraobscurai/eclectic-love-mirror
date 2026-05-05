import type { GalleryProject } from "@/content/gallery-projects";
import { renderUrl, renderSrcSet } from "@/lib/storage-image";

interface GalleryProjectCardProps {
  project: GalleryProject;
  index: number;
  active: boolean;
  onOpen: () => void;
  registerRef: (el: HTMLLIElement | null) => void;
}

export function GalleryProjectCard({
  project,
  index,
  active,
  onOpen,
  registerRef,
}: GalleryProjectCardProps) {
  return (
    <li
      ref={registerRef}
      data-index={index}
      className={[
        "group relative shrink-0 snap-center transition-all duration-500",
        "w-[85vw] md:w-[60vw] lg:w-[45vw] xl:w-[40vw]",
        active
          ? "opacity-100 scale-100"
          : "opacity-60 scale-[0.97] hover:opacity-80 hover:scale-[0.98]",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${project.name}`}
        className="block w-full text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/40"
      >
        <div
          className={[
            "relative aspect-[4/5] overflow-hidden bg-charcoal/50 ring-1 ring-cream/5 transition-shadow duration-500",
            active
              ? "shadow-[0_25px_60px_-12px_rgba(0,0,0,0.55)]"
              : "shadow-2xl shadow-black/40",
          ].join(" ")}
        >
          <img
            src={renderUrl(project.heroImage.src, { width: 1200, quality: 72 })}
            srcSet={renderSrcSet(project.heroImage.src, [800, 1200, 1600], 72)}
            sizes="(min-width: 1280px) 40vw, (min-width: 1024px) 45vw, (min-width: 768px) 60vw, 85vw"
            alt={project.heroImage.alt}
            loading={index < 2 ? "eager" : "lazy"}
            decoding="async"
            {...(index === 0 ? ({ fetchPriority: "high" } as Record<string, string>) : {})}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            draggable={false}
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent pointer-events-none" />

          {/* Project number */}
          <div className="absolute top-5 left-5 text-cream/60 text-[10px] tracking-[0.32em] font-light uppercase">
            {project.number}
          </div>

          {/* Hover circle */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <span className="w-16 h-16 rounded-full border border-cream/30 flex items-center justify-center backdrop-blur-sm bg-black/20 text-cream/80">
              →
            </span>
          </div>

          {/* Bottom info */}
          <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8 text-cream">
            <div className="text-cream/70 text-[10px] uppercase tracking-[0.24em] mb-2">
              {project.region}
            </div>
            <h3 className="font-display text-2xl lg:text-3xl text-cream font-light tracking-tight">
              {project.name}
            </h3>
            <div className="flex items-center gap-3 mt-3 text-cream/55 text-[11px] uppercase tracking-[0.18em]">
              <span>{project.kind}</span>
              <span aria-hidden className="w-1 h-1 rounded-full bg-cream/30" />
              <span>{project.year}</span>
            </div>
          </div>
        </div>
      </button>
    </li>
  );
}
