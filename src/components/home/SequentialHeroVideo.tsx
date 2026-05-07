import { useEffect, useRef, useState } from "react";
import { HERO_CLIPS } from "./clips";

const SOURCES = HERO_CLIPS.map((c) => c.src?.mp4).filter(Boolean) as string[];
const POSTERS = HERO_CLIPS.map((c) => c.poster);

/**
 * Full-viewport sequential video reel.
 * - Sits at the top of the Home page; nav bar overlays transparently above.
 * - Plays clips 1 → 5, then loops back to 1.
 * - Muted + playsInline + preload=auto for iOS/Android autoplay.
 */
export function SequentialHeroVideo() {
  const [index, setIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // Force reload when src changes, then play.
    v.load();
    const p = v.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }, [index]);

  if (SOURCES.length === 0) return null;

  return (
    <section
      className="relative w-full h-[100dvh] overflow-hidden bg-charcoal"
      aria-label="Eclectic Hive seasonal reel"
    >
      <video
        ref={videoRef}
        key={SOURCES[index]}
        src={SOURCES[index]}
        poster={POSTERS[index]}
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={() => setIndex((i) => (i + 1) % SOURCES.length)}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Preload next clip silently to keep transitions seamless */}
      <link rel="preload" as="video" href={SOURCES[(index + 1) % SOURCES.length]} />
    </section>
  );
}
