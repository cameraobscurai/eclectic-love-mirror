import { useEffect, useRef, useState } from "react";
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
//   - when a real image is provided, it cross-fades in over the stone wash
//     instead of popping — late arrivals dissolve into the frame they
//     already occupy, never replace a hard empty box with a hard image.
//
// When a real image arrives, pass `src` + `alt` and the same frame holds it.
// ---------------------------------------------------------------------------

interface MediaApertureProps {
  /** CSS aspect-ratio string, e.g. "4/5", "3/2", "1/1". Defaults to "4/5". */
  ratio?: string;
  /** Real image URL, when available. */
  src?: string;
  /** Optional `srcset` for responsive variants. */
  srcSet?: string;
  /** Optional `sizes` attribute paired with `srcSet`. */
  sizes?: string;
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
  /** Hint browser priority. Use "high" for above-the-fold portraits. */
  fetchPriority?: "high" | "low" | "auto";
}

export function MediaAperture({
  ratio = "4/5",
  src,
  srcSet,
  sizes,
  alt,
  caption,
  label,
  className,
  lazy = true,
  fetchPriority,
}: MediaApertureProps) {
  const [loaded, setLoaded] = useState(false);

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
            srcSet={srcSet}
            sizes={sizes}
            alt={alt ?? ""}
            loading={lazy ? "lazy" : "eager"}
            decoding="async"
            onLoad={() => setLoaded(true)}
            // React types lag the spec; cast for fetchpriority.
            {...(fetchPriority
              ? ({ fetchpriority: fetchPriority } as Record<string, string>)
              : {})}
            className="absolute inset-0 w-full h-full object-cover will-change-opacity"
            style={{
              opacity: loaded ? 1 : 0,
              transition: "opacity 420ms ease-out",
            }}
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
      {label && (
        <figcaption className="mt-3 text-[10px] uppercase tracking-[0.28em] text-charcoal/55">
          {label}
        </figcaption>
      )}
      {caption && (
        <figcaption className="mt-2 text-[13px] leading-relaxed text-charcoal/65">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
