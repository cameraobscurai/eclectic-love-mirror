import type { GalleryImage } from "@/content/gallery-projects";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// GalleryThumbnailStrip
//
// Renders detail thumbnails inside the project panel. Only mounts when
// `images.length > 0` — the parent decides not to render this component at
// all when the project has no detail crops.
// ---------------------------------------------------------------------------

interface GalleryThumbnailStripProps {
  images: GalleryImage[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

export function GalleryThumbnailStrip({
  images,
  currentIndex,
  onSelect,
}: GalleryThumbnailStripProps) {
  if (images.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
      {images.map((img, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(i)}
          aria-label={`View image ${i + 1} of ${images.length}`}
          aria-current={i === currentIndex}
          className={cn(
            "shrink-0 w-20 h-20 overflow-hidden transition-opacity focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/40",
            i === currentIndex ? "opacity-100" : "opacity-50 hover:opacity-80"
          )}
        >
          <img
            src={img.src}
            alt={img.alt}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </button>
      ))}
    </div>
  );
}
