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
  const [muted, setMuted] = useState(true);
  // Gate the <video> and prefetch <link> behind a client-only mount flag so
  // SSR renders only the poster + sound button. This keeps the SSR markup
  // strictly identical between server and first client render — the video
  // (whose attributes are mutated by autoplay/unmute effects) never enters
  // the hydration diff.
  const [mounted, setMounted] = useState(false);
  const current = HERO_CLIPS[index];
  const next = HERO_CLIPS[(index + 1) % HERO_CLIPS.length];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const v = videoRef.current;
    if (!v) return;

    let cancelled = false;

    const primeAutoplay = () => {
      v.autoplay = true;
      // Only force muted before the user has tapped the sound button. Once
      // they unmute, respect that state across clip changes.
      if (muted) {
        v.defaultMuted = true;
        v.muted = true;
        v.setAttribute("muted", "");
      } else {
        v.muted = false;
        v.removeAttribute("muted");
      }
      v.playsInline = true;
      v.setAttribute("autoplay", "");
      v.setAttribute("playsinline", "");
      v.setAttribute("webkit-playsinline", "");
    };

    const tryPlay = () => {
      if (cancelled) return;
      primeAutoplay();
      const p = v.play();
      if (p && typeof p.then === "function") {
        p.catch(() => {});
      }
    };

    const markReadyAndPlay = () => tryPlay();

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
  }, [index, muted, mounted]);

  const toggleSound = () => {
    const v = videoRef.current;
    setMuted((m) => {
      const nextMuted = !m;
      if (v) {
        v.muted = nextMuted;
        if (!nextMuted) {
          v.play().catch(() => {});
        }
      }
      return nextMuted;
    });
  };

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

      {mounted && (
        <video
          ref={videoRef}
          key={current.id}
          className="absolute inset-0 h-full w-full object-cover"
          src={current.src?.mp4}
          poster={current.poster}
          autoPlay
          muted={muted}
          playsInline
          preload="auto"
          {...({ "webkit-playsinline": "true" } as Record<string, unknown>)}
          onEnded={() => setIndex((i) => (i + 1) % HERO_CLIPS.length)}
          aria-label={current.label}
        />
      )}

      {/* Sound toggle — mobile users can tap to hear the season clips. */}
      <button
        type="button"
        onClick={toggleSound}
        aria-label={muted ? "Unmute video" : "Mute video"}
        aria-pressed={!muted}
        className="absolute bottom-6 right-5 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-charcoal/55 text-paper backdrop-blur-sm active:scale-95 transition-transform"
      >
        {muted ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H3v6h3l5 4V5z" />
            <line x1="22" y1="9" x2="16" y2="15" />
            <line x1="16" y1="9" x2="22" y2="15" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H3v6h3l5 4V5z" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        )}
      </button>

      {/* Preload the next clip only after the first has begun playing,
          so it never competes with the LCP fetch. */}
      <link rel="prefetch" as="video" href={next.src?.mp4} />
    </div>
  );
}

