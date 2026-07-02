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
  // Start on the preloaded first clip. Randomizing here made mobile Safari
  // chase a cold, non-preloaded source and left the poster looking stuck.
  const [index, setIndex] = useState(0);
  const [videoReady, setVideoReady] = useState(false);

  const current = HERO_CLIPS[index];
  const next = HERO_CLIPS[(index + 1) % HERO_CLIPS.length];

  useEffect(() => {
    setVideoReady(false);
    const v = videoRef.current;
    if (!v) return;

    let cancelled = false;

    const primeAutoplay = () => {
      v.autoplay = true;
      v.defaultMuted = true;
      v.muted = true;
      v.playsInline = true;
      v.setAttribute("autoplay", "");
      v.setAttribute("muted", "");
      v.setAttribute("playsinline", "");
      v.defaultMuted = true;
      v.setAttribute("webkit-playsinline", "");
    };

    const tryPlay = () => {
      if (cancelled) return;
      primeAutoplay();
      const p = v.play();
      if (p && typeof p.then === "function") {
        p.then(() => {
          if (!cancelled) setVideoReady(true);
        }).catch(() => {});
      }
    };

    const markReadyAndPlay = () => {
      if (!cancelled) setVideoReady(true);
      tryPlay();
    };

    primeAutoplay();
    v.addEventListener("canplay", markReadyAndPlay);
    v.addEventListener("playing", markReadyAndPlay);
    v.load();
    tryPlay();
    const retry = window.setTimeout(tryPlay, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(retry);
      v.removeEventListener("canplay", markReadyAndPlay);
      v.removeEventListener("playing", markReadyAndPlay);
    };
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
        poster={current.poster}
        autoPlay
        muted
        playsInline
        preload="auto"
        {...({ defaultMuted: true, "webkit-playsinline": "true" } as Record<string, unknown>)}
        onLoadedData={() => setVideoReady(true)}
        onCanPlay={() => setVideoReady(true)}
        onPlaying={() => setVideoReady(true)}
        onEnded={() => setIndex((i) => (i + 1) % HERO_CLIPS.length)}
        aria-label={current.label}
      />
      {/* Preload the next clip only after the first has begun playing,
          so it never competes with the LCP fetch. */}
      <link rel="prefetch" as="video" href={next.src?.mp4} />
    </div>
  );
}
