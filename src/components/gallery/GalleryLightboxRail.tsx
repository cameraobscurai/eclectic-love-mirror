import { useEffect, useRef } from "react";
import type { GalleryImage } from "@/content/gallery-projects";
import { renderUrl } from "@/lib/storage-image";

// ---------------------------------------------------------------------------
// GalleryLightboxRail
//
// Bottom thumbnail filmstrip + plate-progress rule for the lightbox.
// Active thumbnail auto-scrolls into view.
// ---------------------------------------------------------------------------

interface GalleryLightboxRailProps {
  images: GalleryImage[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

export function GalleryLightboxRail({
  images,
  currentIndex,
  onSelect,
}: GalleryLightboxRailProps) {
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const active = rail.querySelector<HTMLElement>(`[data-thumb-idx="${currentIndex}"]`);
    if (!active) return;
    const railRect = rail.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const offset =
      activeRect.left -
      railRect.left -
      rail.clientWidth / 2 +
      activeRect.width / 2;
    rail.scrollBy({ left: offset, behavior: "smooth" });
  }, [currentIndex]);

  if (images.length === 0) return null;

  const progress = images.length > 1 ? currentIndex / (images.length - 1) : 0;

  return (
    <div className="border-t border-cream/10 bg-charcoal">
      <div
        ref={railRef}
        className="flex gap-2 overflow-x-auto no-scrollbar px-6 lg:px-10 py-4"
      >
        {images.map((img, i) => {
          const active = i === currentIndex;
          return (
            <button
              key={i}
              type="button"
              data-thumb-idx={i}
              onClick={() => onSelect(i)}
              aria-label={`View plate ${i + 1} of ${images.length}`}
              aria-current={active}
              className={[
                "shrink-0 h-16 w-24 overflow-hidden transition-opacity",
                "focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/40",
                active ? "opacity-100 ring-1 ring-cream/70" : "opacity-45 hover:opacity-90",
              ].join(" ")}
            >
              <img
                src={renderUrl(img.src, { width: 240, quality: 65 })}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
                className="w-full h-full object-cover"
              />
            </button>
          );
        })}
      </div>

      {/* Plate progress rule */}
      <div className="px-6 lg:px-10 pb-4 flex items-center gap-4">
        <span className="text-[10px] uppercase tracking-[0.28em] text-cream/55 tabular-nums">
          {(currentIndex + 1).toString().padStart(2, "0")}
        </span>
        <div className="flex-1 h-px bg-cream/10 overflow-hidden">
          <div
            className="h-full bg-cream/45 transition-[width] duration-200"
            style={{ width: `${Math.max(6, progress * 100)}%` }}
          />
        </div>
        <span className="text-[10px] uppercase tracking-[0.28em] text-cream/35 tabular-nums">
          {images.length.toString().padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}
