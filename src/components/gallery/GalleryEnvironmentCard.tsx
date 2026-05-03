import type { GalleryProject } from "@/content/gallery-projects";

// ---------------------------------------------------------------------------
// GalleryEnvironmentCard
//
// One huge environment card in the horizontal track. Number top-left, region
// tag bottom-left, big cover image, serif name + meta beneath. Honors v0.
// ---------------------------------------------------------------------------

interface GalleryEnvironmentCardProps {
  project: GalleryProject;
  eager?: boolean;
  onOpen: () => void;
}

export function GalleryEnvironmentCard({
  project,
  eager,
  onOpen,
}: GalleryEnvironmentCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${project.name} — ${project.location}`}
      className="group block text-left w-full focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/40 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal"
    >
      <div
        className="relative w-full overflow-hidden bg-[color-mix(in_oklab,var(--cream)_4%,var(--charcoal))]"
        style={{ aspectRatio: "4 / 5" }}
      >
        <img
          src={project.heroImage.src}
          alt={project.heroImage.alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.025]"
        />

        {/* Number — top left, on the image */}
        <span className="pointer-events-none absolute top-5 left-5 text-[10px] uppercase tracking-[0.3em] text-cream/80 mix-blend-difference">
          {project.number}
        </span>

        {/* Region — bottom left, on the image */}
        <span className="pointer-events-none absolute bottom-5 left-5 text-[10px] uppercase tracking-[0.3em] text-cream/80 mix-blend-difference">
          {project.region}
        </span>

        {/* Subtle bottom gradient to keep region tag legible */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/30 to-transparent"
        />
      </div>

      <div className="mt-5 flex items-baseline justify-between gap-6">
        <div>
          <h3 className="font-display text-[clamp(1.75rem,2.6vw,2.5rem)] leading-[1.05] tracking-[-0.005em]">
            {project.name}
          </h3>
          <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-cream/55">
            {project.location} · {project.kind}
          </p>
        </div>
        <span className="shrink-0 text-[10px] uppercase tracking-[0.28em] text-cream/45 tabular-nums">
          {project.year}
        </span>
      </div>
    </button>
  );
}
