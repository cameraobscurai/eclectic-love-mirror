import { cn } from "@/lib/utils";
import type { FilmstripClip } from "./clips";

type Loading = "eager" | "lazy";
type FetchPriority = "high" | "low" | "auto";

/**
 * Renders a 3:4 poster as `<picture>` with AVIF → WebP → JPG fallback.
 * Width/height are fixed at the source's 1080×1440 to lock CLS.
 */
export function PosterPicture({
  clip,
  className,
  loading = "lazy",
  fetchPriority = "auto",
  alt = "",
  sizes,
}: {
  clip: Pick<FilmstripClip, "poster" | "posterAvif" | "posterWebp">;
  className?: string;
  loading?: Loading;
  fetchPriority?: FetchPriority;
  alt?: string;
  /**
   * Responsive `sizes` hint forwarded to every `<source>` and the `<img>`.
   * Without this the browser assumes 100vw and downloads the full-res
   * AVIF/WebP even for tiny 20vw filmstrip tiles.
   */
  sizes?: string;
}) {
  return (
    <picture>
      {clip.posterAvif && <source srcSet={clip.posterAvif} sizes={sizes} type="image/avif" />}
      {clip.posterWebp && <source srcSet={clip.posterWebp} sizes={sizes} type="image/webp" />}
      <img
        src={clip.poster}
        alt={alt}
        aria-hidden={alt === "" ? true : undefined}
        width={1080}
        height={1440}
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority}
        sizes={sizes}
        className={cn("h-full w-full object-cover", className)}
      />
    </picture>
  );
}
