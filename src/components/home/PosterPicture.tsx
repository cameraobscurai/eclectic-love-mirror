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
}: {
  clip: Pick<FilmstripClip, "poster" | "posterAvif" | "posterWebp">;
  className?: string;
  loading?: Loading;
  fetchPriority?: FetchPriority;
  alt?: string;
}) {
  return (
    <picture>
      {clip.posterAvif && <source srcSet={clip.posterAvif} type="image/avif" />}
      {clip.posterWebp && <source srcSet={clip.posterWebp} type="image/webp" />}
      <img
        src={clip.poster}
        alt={alt}
        aria-hidden={alt === "" ? true : undefined}
        width={1080}
        height={1440}
        loading={loading}
        decoding="async"
        // @ts-expect-error — React 19 supports lowercase attr; types lag
        fetchpriority={fetchPriority}
        className={cn("h-full w-full object-cover", className)}
      />
    </picture>
  );
}
