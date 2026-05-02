import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// GalleryEmptyFilmstrip
//
// The empty-state exhibition scaffold. Renders the full filmstrip rhythm —
// numbered ghost frames, horizontal rail, progress rule, detail aperture
// row, and one quiet authored line — without any fake project content.
//
// Architecture is identical to the populated filmstrip so when real projects
// land they drop into the same spatial geometry. No fake titles, no fake
// locations, no fake links, no fake imagery.
// ---------------------------------------------------------------------------

const SLOTS = ["01", "02", "03"];

export function GalleryEmptyFilmstrip() {
  const railRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const onScroll = () => {
      const max = rail.scrollWidth - rail.clientWidth;
      setProgress(max > 0 ? rail.scrollLeft / max : 0);
    };
    onScroll();
    rail.addEventListener("scroll", onScroll, { passive: true });
    return () => rail.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="mt-12">
      {/* Quiet authored line — sits inside the gallery structure, not in
          place of it. */}
      <p className="font-display italic text-xl md:text-2xl text-cream/55 max-w-xl">
        Selected projects are being prepared.
      </p>

      {/* Horizontal rail — ghost frames, real scroll mechanics. */}
      <div
        ref={railRef}
        className="mt-12 -mx-6 lg:-mx-12 px-6 lg:px-12 overflow-x-auto no-scrollbar snap-x snap-mandatory"
      >
        <ol className="flex gap-6 lg:gap-10 pb-6">
          {SLOTS.map((n) => (
            <li
              key={n}
              className="snap-start shrink-0 w-[78vw] sm:w-[60vw] md:w-[44vw] lg:w-[34vw] xl:w-[28vw]"
            >
              <div className="flex items-baseline gap-4 mb-3">
                <span className="font-display text-xl text-cream/40 tabular-nums">
                  {n}
                </span>
                <div className="flex-1 border-t border-cream/10" />
              </div>

              {/* Hero ghost aperture — charcoal frame with cream inset rule */}
              <GhostAperture ratio="3/2" />

              {/* Detail aperture row — 4 small crops, mirrors panel rhythm */}
              <div className="mt-3 grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <GhostAperture key={i} ratio="1/1" small />
                ))}
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Progress rule — reflects horizontal rail position. Inactive when
          rail does not overflow (e.g. desktop with 3 slots fitting). */}
      <div
        className="mt-2 h-px w-full bg-cream/10 overflow-hidden"
        aria-hidden
      >
        <div
          className="h-full bg-cream/40 transition-[width] duration-200"
          style={{ width: `${Math.max(8, progress * 100)}%` }}
        />
      </div>
    </div>
  );
}

interface GhostApertureProps {
  ratio: string;
  small?: boolean;
}

function GhostAperture({ ratio, small }: GhostApertureProps) {
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        aspectRatio: ratio,
        // Slightly raised charcoal — feels like an exhibition frame in a
        // dimmed gallery, not a developer block.
        backgroundColor: "color-mix(in oklab, var(--cream) 4%, var(--charcoal))",
      }}
    >
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          top: small ? "6px" : "12px",
          right: small ? "6px" : "12px",
          bottom: small ? "6px" : "12px",
          left: small ? "6px" : "12px",
          border: "1px solid color-mix(in oklab, var(--cream) 10%, transparent)",
        }}
      />
    </div>
  );
}
