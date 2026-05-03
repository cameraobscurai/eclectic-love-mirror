import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { GalleryProject } from "@/content/gallery-projects";

// ---------------------------------------------------------------------------
// GalleryGridCard
//
// One project tile in the editorial grid. On hover, cycles through 2–3
// hero plates so the card hints at the project's range without leaving
// the index. Eyebrow above (REGION · KIND · YEAR), Saol Display name below.
// ---------------------------------------------------------------------------

interface Props {
  project: GalleryProject;
  /** "wide" = ~7/12 col, "tall" = ~5/12 col, "feature" = full row 12 col. */
  variant: "wide" | "tall" | "feature";
  /** Eager-load the very first plates above the fold. */
  eager?: boolean;
}

const ASPECT: Record<Props["variant"], string> = {
  wide: "5 / 4",
  tall: "4 / 5",
  feature: "21 / 9",
};

export function GalleryGridCard({ project, variant, eager }: Props) {
  // Use up to three plates to cycle through (hero + first two details).
  const plates = [
    project.heroImage,
    ...project.detailImages.slice(0, 2),
  ].filter(Boolean);

  const [active, setActive] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const start = () => {
    if (plates.length <= 1) return;
    if (intervalRef.current) return;
    intervalRef.current = window.setInterval(() => {
      setActive((i) => (i + 1) % plates.length);
    }, 1400);
  };
  const stop = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setActive(0);
  };

  useEffect(() => () => stop(), []);

  return (
    <Link
      to="/gallery/$slug"
      params={{ slug: project.slug }}
      onMouseEnter={start}
      onMouseLeave={stop}
      onFocus={start}
      onBlur={stop}
      className="group block focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/40 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal"
      aria-label={`Open ${project.name} — ${project.location}`}
    >
      {/* Eyebrow */}
      <div className="mb-3 flex items-baseline justify-between gap-4 text-[10px] uppercase tracking-[0.3em] text-cream/45">
        <span className="tabular-nums">{project.number}</span>
        <span className="truncate">
          {project.region} · {project.kind} · {project.year}
        </span>
      </div>

      {/* Image frame */}
      <div
        className="relative w-full overflow-hidden bg-[color-mix(in_oklab,var(--cream)_4%,var(--charcoal))]"
        style={{ aspectRatio: ASPECT[variant] }}
      >
        {plates.map((plate, i) => (
          <img
            key={plate.src}
            src={plate.src}
            alt={i === 0 ? plate.alt : ""}
            aria-hidden={i !== 0 ? true : undefined}
            loading={eager && i === 0 ? "eager" : "lazy"}
            decoding="async"
            draggable={false}
            className={[
              "absolute inset-0 w-full h-full object-cover",
              "transition-opacity duration-700 ease-out",
              i === active ? "opacity-100" : "opacity-0",
              i === 0 ? "group-hover:scale-[1.02] transition-transform duration-[1200ms]" : "",
            ].join(" ")}
          />
        ))}
        {/* Plate count, bottom-right, only on hover */}
        <span className="pointer-events-none absolute bottom-4 right-4 text-[10px] uppercase tracking-[0.3em] text-cream/85 mix-blend-difference opacity-0 group-hover:opacity-100 transition-opacity duration-300 tabular-nums">
          {String(project.detailImages.length).padStart(2, "0")} PLATES
        </span>
      </div>

      {/* Title */}
      <div className="mt-5">
        <h3
          className={[
            "font-display leading-[1.05] tracking-[-0.005em]",
            variant === "feature"
              ? "text-[clamp(2.25rem,4.5vw,4rem)]"
              : "text-[clamp(1.75rem,2.6vw,2.5rem)]",
          ].join(" ")}
        >
          {project.name}
        </h3>
        <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-cream/55">
          {project.location}
        </p>
      </div>
    </Link>
  );
}
