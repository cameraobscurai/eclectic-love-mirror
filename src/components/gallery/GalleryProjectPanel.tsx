import { useEffect, useState } from "react";
import type { GalleryProject } from "@/content/gallery-projects";
import { GalleryThumbnailStrip } from "./GalleryThumbnailStrip";

// ---------------------------------------------------------------------------
// GalleryProjectPanel
//
// Detail overlay for a single selected project. Only mounted by the parent
// when a real project is selected — there is no fake panel UI. Manages its
// own scroll lock, current-image index, and ESC/← / → keyboard nav.
// ---------------------------------------------------------------------------

interface GalleryProjectPanelProps {
  project: GalleryProject;
  onClose: () => void;
}

export function GalleryProjectPanel({ project, onClose }: GalleryProjectPanelProps) {
  const allImages = project.detailImages.length > 0 ? project.detailImages : [project.heroImage];
  const [currentIndex, setCurrentIndex] = useState(0);

  // Lock body scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Keyboard nav: Esc closes, arrows step through images.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentIndex((i) => Math.min(allImages.length - 1, i + 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [allImages.length, onClose]);

  const current = allImages[currentIndex];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${project.name} — project detail`}
      className="fixed inset-0 z-50 bg-charcoal text-cream flex flex-col"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 lg:px-12 py-5 border-b border-cream/10">
        <div className="flex items-baseline gap-4">
          <span className="font-display text-xl text-cream/45 tabular-nums">
            {project.number}
          </span>
          <p className="font-display text-2xl uppercase tracking-[0.04em]">
            {project.name}
          </p>
          <span className="hidden md:inline text-[10px] uppercase tracking-[0.22em] text-cream/45">
            {project.location} · {project.year}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[10px] uppercase tracking-[0.28em] text-cream/70 hover:text-cream focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/40 px-3 py-2"
        >
          CLOSE
        </button>
      </div>

      {/* Main image */}
      <div className="flex-1 overflow-auto px-6 lg:px-12 py-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="w-full" style={{ aspectRatio: "3/2" }}>
            <img
              src={current.src}
              alt={current.alt}
              className="w-full h-full object-cover"
            />
          </div>

          {project.note && (
            <p className="mt-8 max-w-2xl text-base leading-relaxed text-cream/75">
              {project.note}
            </p>
          )}
        </div>
      </div>

      {/* Thumbnail strip */}
      <div className="border-t border-cream/10 px-6 lg:px-12 py-4">
        <GalleryThumbnailStrip
          images={allImages}
          currentIndex={currentIndex}
          onSelect={setCurrentIndex}
        />
      </div>
    </div>
  );
}
