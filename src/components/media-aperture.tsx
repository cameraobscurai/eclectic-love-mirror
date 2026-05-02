import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// MediaAperture
//
// A framed, ratio-locked surface where real photography will eventually live.
// Used across Gallery and Atelier so empty pages still prove spacing,
// hierarchy, and image rhythm before assets exist.
//
// Visual language:
//   - warm cream/stone surface (var(--sand) at low opacity over cream)
//   - thin charcoal divider on the inside edge (inset line)
//   - aspect-ratio locked via the `ratio` prop
//   - no "image placeholder" text, no broken-image icons, no dashed boxes
//   - feels like an empty print mount, not a developer placeholder
//
// When a real image arrives, pass `src` + `alt` and the same frame holds it.
// ---------------------------------------------------------------------------

interface MediaApertureProps {
  /** CSS aspect-ratio string, e.g. "4/5", "3/2", "1/1". Defaults to "4/5". */
  ratio?: string;
  /** Real image URL, when available. */
  src?: string;
  /** Required when `src` is provided. */
  alt?: string;
  /** Optional caption rendered below the frame. */
  caption?: string;
  /**
   * Optional ALL-CAPS category label rendered below the frame.
   * Use only for real categories (e.g. STUDIO, WORKBENCH, WAREHOUSE),
   * never for fake image captions.
   */
  label?: string;
  className?: string;
  /** Lazy-load the inner image. Defaults to true. */
  lazy?: boolean;
}

export function MediaAperture({
  ratio = "4/5",
  src,
  alt,
  caption,
  label,
  className,
  lazy = true,
}: MediaApertureProps) {
  return (
    <figure className={cn("block", className)}>
      <div
        className="relative w-full overflow-hidden"
        style={{
          aspectRatio: ratio,
          // Subtle stone wash over cream — feels like a mounted print surface,
          // not a gray dev box. Approved imagery drops in over the top.
          backgroundColor: "color-mix(in oklab, var(--sand) 35%, var(--cream))",
        }}
      >
        {src ? (
          <img
            src={src}
            alt={alt ?? ""}
            loading={lazy ? "lazy" : "eager"}
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          // Inset hairline — print-mount feel. No icons, no text.
          <div
            aria-hidden="true"
            className="absolute pointer-events-none"
            style={{
              top: "10px",
              right: "10px",
              bottom: "10px",
              left: "10px",
              border: "1px solid color-mix(in oklab, var(--charcoal) 10%, transparent)",
            }}
          />
        )}
      </div>
      {caption && (
        <figcaption className="mt-3 text-[10px] uppercase tracking-[0.22em] text-charcoal/50">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
