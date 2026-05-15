import { useEffect, useRef, useState } from "react";
import { HERO_CLIPS } from "./clips";
import { PosterPicture } from "./PosterPicture";

/**
 * Mobile-first full-viewport sequential video reel.
 * Plays HERO_CLIPS in order, loops back to first after the last.
 *
 * Paint discipline: a `<picture>` (AVIF → WebP → JPG) sits behind the
 * `<video>` so the LCP is the poster, not the video frame. When the video's
 * first frame is decoded the poster fades to keep the swap invisible.
 */
export function SequentialHeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Randomize the opening clip per visit so repeat viewers don't always
  // land on the same season (mobile-only component).
  const [index, setIndex] = useState(() =>
    Math.floor(Math.random() * HERO_CLIPS.length),
  );
  const [videoReady, setVideoReady] = useState(false);

  const current = HERO_CLIPS[index];
  const next = HERO_CLIPS[(index + 1) % HERO_CLIPS.length];

  useEffect(() => {
    setVideoReady(false);
    const v = videoRef.current;
    if (!v) return;
    v.load();
    const p = v.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }, [index]);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-charcoal">
      {/* LCP poster — paints immediately, no video decode required. */}
      <div className="absolute inset-0">
        <PosterPicture
          clip={current}
          loading="eager"
          fetchPriority="high"
          className="h-full w-full"
        />
      </div>

      <video
        ref={videoRef}
        key={current.id}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          videoReady ? "opacity-100" : "opacity-0"
        }`}
        src={current.src?.mp4}
        autoPlay
        muted
        playsInline
        // "metadata" lets the browser fetch just enough to begin playback
        // while the poster owns first paint.
        preload="metadata"
        {...({ "webkit-playsinline": "true" } as Record<string, string>)}
        onLoadedData={() => setVideoReady(true)}
        onEnded={() => setIndex((i) => (i + 1) % HERO_CLIPS.length)}
        aria-label={current.label}
      />
      {/* Preload the next clip only after the first has begun playing,
          so it never competes with the LCP fetch. */}
      <link rel="prefetch" as="video" href={next.src?.mp4} />
    </div>
  );
}
