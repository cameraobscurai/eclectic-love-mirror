import { forwardRef, useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// HeroImage
//
// Drop-in container for any full-bleed hero photograph. Designed so the
// same component works whether the source is a moody dark moodboard, a
// bright editorial portrait, or a busy collage — without per-image code.
//
// Pair with vite-imagetools:
//
//   import hero from "@/assets/home-hero.jpg?preset=hero";
//   <HeroImage source={hero} alt="" focalPoint={{ x: 50, y: 38 }} priority />
//
// What it handles for you:
//   - <picture> with AVIF + WebP sources (auto-emitted by imagetools)
//   - Responsive widths via srcset/sizes (768/1280/1920/2560)
//   - object-cover with a tunable focal point (so the subject never gets
//     cropped out at narrow viewports — the #1 reason heroes look "off"
//     after a swap)
//   - Quiet cross-fade on load — large heroes never hard-pop in
//   - Optional scrim layers (top/bottom/both/behind-text) for legibility
//     against unknown image brightness, configured per image
//   - `priority` flag → eager + fetchpriority=high (for LCP heroes)
//
// What it does NOT do:
//   - No layout, no CTA bar, no wordmark — purely the image surface.
//     Compose those on top in the route file.
// ---------------------------------------------------------------------------

export interface HeroImageSource {
  /** AVIF/WebP srcset strings keyed by MIME type, from imagetools. */
  sources: Record<string, string>;
  /** Fallback <img> for browsers without <picture> (extremely rare). */
  img: { src: string; w: number; h: number };
}

export interface HeroImageProps {
  /** Output of `import x from "@/assets/foo.jpg?preset=hero"`. */
  source: HeroImageSource;
  /** Required for SEO/a11y. Pass "" if the image is purely decorative. */
  alt: string;
  /**
   * Where the visual subject sits in the source image, as % from top-left.
   * Defaults to dead center (50/50). Tune per image — e.g. a face high in
   * the frame might want { x: 50, y: 30 }.
   */
  focalPoint?: { x: number; y: number };
  /**
   * Adaptive scrim for legibility over unknown image brightness.
   * - "none"        — no overlay
   * - "bottom"      — dark wash on lower 28% (default; pairs with bottom CTAs)
   * - "top"         — dark wash on upper 28%
   * - "both"        — top + bottom washes
   * - "full"        — even dark veil over the whole image
   */
  scrim?: "none" | "bottom" | "top" | "both" | "full";
  /** Strength of the scrim, 0-1. Defaults to 0.55. */
  scrimStrength?: number;
  /**
   * Mark as LCP element. Sets eager loading + fetchpriority=high. Use ONLY
   * for the above-the-fold hero on a page; never more than one per route.
   */
  priority?: boolean;
  /**
   * Sizes hint for the responsive srcset. Defaults to "100vw" (full-bleed).
   * Override only if the hero is not full-bleed.
   */
  sizes?: string;
  /** Extra classes on the wrapping <picture>. */
  className?: string;
  /** Extra inline styles applied to the <img>. */
  imgStyle?: CSSProperties;
  /** Fires once the image has decoded — useful for animating overlays in. */
  onLoad?: () => void;
}

/**
 * Renders the hero <picture> with all responsive variants.
 *
 * The wrapping <picture> is `absolute inset-0` so this component drops
 * into any positioned hero section without extra layout work.
 */
export const HeroImage = forwardRef<HTMLImageElement, HeroImageProps>(
  function HeroImage(
    {
      source,
      alt,
      focalPoint = { x: 50, y: 50 },
      scrim = "bottom",
      scrimStrength = 0.55,
      priority = false,
      sizes = "100vw",
      className,
      imgStyle,
      onLoad,
    },
    ref,
  ) {
    const [loaded, setLoaded] = useState(false);
    const localRef = useRef<HTMLImageElement | null>(null);
    const objectPosition = `${focalPoint.x}% ${focalPoint.y}%`;

    // Catch images already decoded before React attached onLoad
    // (SSR / cached / eager). Without this they stay opacity:0.
    useEffect(() => {
      if (localRef.current?.complete && localRef.current.naturalWidth > 0) {
        setLoaded(true);
      }
    }, [source.img.src]);

    return (
      <>
        <picture className={cn("absolute inset-0 block", className)}>
          {/* AVIF first (smallest), then WebP fallback. JPEG/PNG fallback is
              the <img> below — modern browsers will already have matched. */}
          {source.sources.avif && (
            <source type="image/avif" srcSet={source.sources.avif} sizes={sizes} />
          )}
          {source.sources.webp && (
            <source type="image/webp" srcSet={source.sources.webp} sizes={sizes} />
          )}
          <img
            ref={(el) => {
              localRef.current = el;
              if (typeof ref === "function") ref(el);
              else if (ref) (ref as React.MutableRefObject<HTMLImageElement | null>).current = el;
            }}
            src={source.img.src}
            width={source.img.w}
            height={source.img.h}
            alt={alt}
            decoding="async"
            loading={priority ? "eager" : "lazy"}
            // React types lag the spec; cast for fetchpriority.
            {...(priority
              ? ({ fetchpriority: "high" } as Record<string, string>)
              : {})}
            draggable={false}
            onLoad={() => {
              setLoaded(true);
              onLoad?.();
            }}
            className="absolute inset-0 w-full h-full object-cover will-change-opacity"
            style={{
              objectPosition,
              opacity: loaded ? 1 : 0,
              // 700ms feels right for a hero — long enough to register as a
              // dissolve, short enough that prioritized images feel instant.
              transition: "opacity 700ms ease-out",
              ...imgStyle,
            }}
          />
        </picture>

        {/* Scrim layer — pointer-events:none so it never blocks interactions
            on the layout above. Rendered outside <picture> so it can sit
            above the image without interfering with native source selection. */}
        {scrim !== "none" && (
          <Scrim variant={scrim} strength={scrimStrength} loaded={loaded} />
        )}
      </>
    );
  },
);

interface ScrimProps {
  variant: Exclude<HeroImageProps["scrim"], "none" | undefined>;
  strength: number;
  loaded: boolean;
}

function Scrim({ variant, strength, loaded }: ScrimProps) {
  // Charcoal wash, alpha derived from strength. Always uses the brand
  // charcoal so the scrim feels of-a-piece with the rest of the system,
  // not a generic black.
  const tint = `color-mix(in oklab, var(--charcoal) ${Math.round(
    strength * 100,
  )}%, transparent)`;

  const common: CSSProperties = {
    pointerEvents: "none",
    opacity: loaded ? 1 : 0,
    // Fade scrims in alongside the image so they don't appear over an
    // empty frame during decode.
    transition: "opacity 700ms ease-out",
    transitionDelay: loaded ? "120ms" : "0ms",
  };

  if (variant === "full") {
    return (
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ ...common, background: tint }}
      />
    );
  }

  return (
    <>
      {(variant === "top" || variant === "both") && (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[28%]"
          style={{
            ...common,
            background: `linear-gradient(to top, transparent 0%, ${tint} 100%)`,
          }}
        />
      )}
      {(variant === "bottom" || variant === "both") && (
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[28%]"
          style={{
            ...common,
            background: `linear-gradient(to bottom, transparent 0%, ${tint} 100%)`,
          }}
        />
      )}
    </>
  );
}

/**
 * Build a `<link rel="preload">` descriptor for a HeroImage source. Pass
 * the result into a TanStack Start route's `head().links` so the browser
 * starts the AVIF download before React even mounts.
 *
 *   links: [heroPreloadLink(homeHero)]
 */
export function heroPreloadLink(source: HeroImageSource) {
  // Prefer AVIF; the browser will download only this one if it supports AVIF.
  // We pass the full srcset + sizes so the preload scanner picks the right
  // width — critical, otherwise it grabs the largest variant by default.
  const href = source.sources.avif ? extractFirstSrc(source.sources.avif) : source.img.src;
  return {
    rel: "preload" as const,
    as: "image" as const,
    href,
    type: source.sources.avif ? "image/avif" : undefined,
    imagesrcset: source.sources.avif ?? source.sources.webp,
    imagesizes: "100vw",
    fetchpriority: "high" as const,
  };
}

function extractFirstSrc(srcset: string): string {
  // "url 768w, url 1280w, ..." → "url"
  return srcset.split(",")[0]?.trim().split(/\s+/)[0] ?? "";
}
