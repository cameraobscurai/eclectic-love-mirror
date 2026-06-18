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
  const pending = !!project.pending;
  // Storage URLs go through the render endpoint; data: URIs (pending placeholders)
  // are returned untouched by renderUrl, so the same call is safe for both.
  const isStorage = project.heroImage.src.includes("/storage/v1/object/public/");

  return (
    <li
      ref={registerRef}
      data-index={index}
      className={[
        "group relative shrink-0 snap-center transition-all duration-500",
        "w-[82vw] md:w-[60vw] lg:w-[45vw] xl:w-[40vw] xl:max-w-[620px]",
        active
          ? "opacity-100 scale-100"
          : "opacity-60 scale-[0.97] hover:opacity-80 hover:scale-[0.98]",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={(e) => onOpen(e.currentTarget.querySelector("img"))}
        aria-label={`Open ${project.name}`}
        className="block w-full text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/40"
      >
        <div
          className={[
            "relative aspect-[4/5] overflow-hidden bg-charcoal ring-1 ring-cream/5 transition-shadow duration-500",
            active
              ? "shadow-[0_25px_60px_-12px_rgba(0,0,0,0.55)] gallery-card-active"
              : "shadow-2xl shadow-black/40",
          ].join(" ")}
        >
          <img
            src={isStorage ? renderUrl(project.heroImage.src, { width: 1200, quality: 72 }) : project.heroImage.src}
            srcSet={isStorage ? renderSrcSet(project.heroImage.src, [800, 1200, 1600], 72) : undefined}
            sizes={isStorage ? "(min-width: 1280px) 40vw, (min-width: 1024px) 45vw, (min-width: 768px) 60vw, 85vw" : undefined}
            alt={project.heroImage.alt}
            loading={index < 2 ? "eager" : "lazy"}
            decoding="async"
            {...(index === 0 ? ({ fetchPriority: "high" } as Record<string, string>) : {})}
            className="gallery-card-img absolute inset-0 w-full h-full object-cover will-change-transform"
            draggable={false}
          />


          {pending && (
            <div className="absolute inset-0 flex items-end justify-start p-6 pointer-events-none">
              <span className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.32em] text-cream/55">
                <span className="h-px w-6 bg-cream/30" aria-hidden />
                Arriving Soon
              </span>
            </div>
          )}
        </div>

        {/* Caption — planner promoted to co-headline (trade proof: "Easton × Eclectic Hive") */}
        <div className="mt-4 text-cream">
          <h3 className="text-[11px] lg:text-[12px] uppercase tracking-[0.26em] text-cream truncate">
            {project.planner}
          </h3>
          <div className="mt-2 flex items-baseline justify-between gap-6">
            <p className="text-[11px] uppercase tracking-[0.24em] text-cream/55 truncate">
              {project.name}
            </p>
            <span className="text-cream/35 text-[10px] uppercase tracking-[0.28em] tabular-nums shrink-0">
              {project.year}
            </span>
          </div>
        </div>
      </button>
    </li>
  );
}
