import { Link } from "@tanstack/react-router";
import type { GalleryProject } from "@/content/gallery-projects";

// ---------------------------------------------------------------------------
// GalleryNextProject
//
// Full-bleed teaser of the next environment at the bottom of a spread.
// The "turn the page" moment.
// ---------------------------------------------------------------------------

interface Props {
  next: GalleryProject;
}

export function GalleryNextProject({ next }: Props) {
  return (
    <Link
      to="/gallery/$slug"
      params={{ slug: next.slug }}
      className="group relative block w-full overflow-hidden focus:outline-none"
      aria-label={`Next environment — ${next.name}`}
    >
      <div className="relative w-full" style={{ aspectRatio: "21 / 9" }}>
        <img
          src={next.heroImage.src}
          alt={next.heroImage.alt}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1500ms] ease-out group-hover:scale-[1.03]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/30 to-charcoal/40"
        />
        <div className="absolute inset-0 flex flex-col justify-between p-6 lg:p-12">
          <p className="text-[10px] uppercase tracking-[0.3em] text-cream/70">
            Next Environment
          </p>
          <div className="flex items-end justify-between gap-8">
            <div>
              <h2 className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] tracking-[-0.01em] text-cream">
                {next.name}
              </h2>
              <p className="mt-3 text-[11px] uppercase tracking-[0.28em] text-cream/70">
                {next.location} · {next.year}
              </p>
            </div>
            <span className="text-[10px] uppercase tracking-[0.3em] text-cream/80 border-b border-cream/40 pb-1 group-hover:border-cream transition-colors">
              Turn the page →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
