import type { GalleryProject } from "@/content/gallery-projects";
import { renderUrl, renderSrcSet } from "@/lib/storage-image";

interface GalleryProjectCardProps {
  project: GalleryProject;
  index: number;
  active: boolean;
  onOpen: (sourceEl: HTMLElement | null) => void;
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
            "relative aspect-[4/5] overflow-hidden bg-charcoal ring-1 ring-cream/5 transition-shadow duration-500",
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
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
        </div>

        {/* Minimal caption — title + year only */}
        <div className="mt-5 flex items-baseline justify-between gap-6 text-cream">
          <h3 className="text-[11px] uppercase tracking-[0.24em] text-cream/85 truncate">
            {project.name}
          </h3>
          <span className="text-cream/35 text-[10px] uppercase tracking-[0.28em] tabular-nums shrink-0">
            {project.year}
          </span>
        </div>
      </button>
    </li>
  );
}
