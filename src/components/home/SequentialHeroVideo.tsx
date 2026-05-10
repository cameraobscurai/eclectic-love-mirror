import { useEffect, useRef, useState } from "react";
import { HERO_CLIPS } from "./clips";

/**
 * Mobile-first full-viewport sequential video reel.
 * Plays HERO_CLIPS in order, loops back to first after the last.
 */
export function SequentialHeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Randomize the opening clip per visit so repeat viewers don't always
  // land on the same season (mobile-only component).
  const [index, setIndex] = useState(() =>
    Math.floor(Math.random() * HERO_CLIPS.length),
  );

  const current = HERO_CLIPS[index];
  const next = HERO_CLIPS[(index + 1) % HERO_CLIPS.length];

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.load();
    const p = v.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }, [index]);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-charcoal">
      <video
        ref={videoRef}
        key={current.id}
        className="absolute inset-0 h-full w-full object-cover"
        src={current.src?.mp4}
        poster={current.poster}
        autoPlay
        muted
        playsInline
        // Was "auto" — that fetched the full clip during initial paint and
        // pushed FCP/LCP backward. "metadata" lets the browser fetch just
        // enough to begin playback while the poster owns first paint.
        preload="metadata"
        {...({ "webkit-playsinline": "true" } as Record<string, string>)}
        onEnded={() => setIndex((i) => (i + 1) % HERO_CLIPS.length)}
        aria-label={current.label}
      />
      {/* Preload the next clip only after the first has begun playing,
          so it never competes with the LCP fetch. */}
      <link rel="prefetch" as="video" href={next.src?.mp4} />
    </div>
  );
}
