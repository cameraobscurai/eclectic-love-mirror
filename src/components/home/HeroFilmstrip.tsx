import { useEffect, useRef, useState, useCallback } from "react";
import { motion, useScroll, useTransform, useReducedMotion, type MotionValue } from "framer-motion";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { HERO_CLIPS, type FilmstripClip } from "./clips";

/**
 * HeroFilmstrip
 * -------------
 * Five vertical 3:4 frames sitting on flat white. Each frame shows a static
 * poster on load and plays muted on hover (desktop) or tap (touch). A single
 * audio toggle per active frame unmutes that one and re-mutes all others.
 *
 * Responsive plan:
 *   ≥1024px  → 5-up row (full reference layout)
 *    640–1023px → 3-up row (frames 2-3-4 emphasized; 1 & 5 hidden via `lg:flex` on the outers)
 *    <640px   → horizontal snap-scroll carousel, each frame ~80vw wide
 *
 * Reduced motion → never autoplay; show a manual play button per frame.
 */

interface HeroFilmstripProps {
  clips?: FilmstripClip[];
  className?: string;
}

export function HeroFilmstrip({ clips = HERO_CLIPS, className }: HeroFilmstripProps) {
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const fadeTimers = useRef<Record<string, number>>({});
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [audioId, setAudioId] = useState<string | null>(null);
  const [inView, setInView] = useState(true);
  // Browsers require a real user gesture (click/tap/keydown) before any
  // <video> can play with audio. Hover alone doesn't count. We listen
  // once for any first interaction on the document, then hover-to-unmute
  // works for the rest of the session.
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  useEffect(() => {
    if (audioUnlocked) return;
    const unlock = () => setAudioUnlocked(true);
    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [audioUnlocked]);

  // Pause everything when the strip leaves the viewport.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (inView) return;
    Object.values(videoRefs.current).forEach((v) => {
      if (!v) return;
      v.pause();
      v.muted = true;
    });
    setAudioId(null);
  }, [inView]);

  // Smooth volume fades (~280ms) instead of hard mute toggles.
  const fadeVolume = useCallback((v: HTMLVideoElement, target: number, id: string) => {
    if (fadeTimers.current[id]) {
      window.clearInterval(fadeTimers.current[id]);
    }
    const start = v.volume;
    const startedAt = performance.now();
    const DURATION = 280;
    const tick = () => {
      const t = Math.min((performance.now() - startedAt) / DURATION, 1);
      v.volume = start + (target - start) * t;
      if (t >= 1) {
        v.volume = target;
        if (target === 0) v.muted = true;
        window.clearInterval(fadeTimers.current[id]);
        delete fadeTimers.current[id];
      }
    };
    fadeTimers.current[id] = window.setInterval(tick, 16);
  }, []);

  // React to audioId changes: unmute the active clip with a fade-in,
  // fade-out everything else.
  useEffect(() => {
    if (reduced) return;
    Object.entries(videoRefs.current).forEach(([id, v]) => {
      if (!v) return;
      if (id === audioId && audioUnlocked && inView) {
        v.muted = false;
        if (v.volume === 0) v.volume = 0.0001;
        fadeVolume(v, 1, id);
      } else {
        fadeVolume(v, 0, id);
      }
      v.play().catch(() => {});
    });
  }, [audioId, audioUnlocked, reduced, inView, fadeVolume]);

  // Kick playback explicitly once refs are registered. Stagger by ~120ms so
  // browsers don't throttle 5 concurrent video downloads (only the first
  // would actually start otherwise).
  useEffect(() => {
    if (reduced) return;
    const timers: number[] = [];
    Object.entries(videoRefs.current).forEach(([_id, v], i) => {
      if (!v) return;
      const t = window.setTimeout(() => {
        try {
          v.muted = true;
          v.load();
          v.play().catch(() => {});
        } catch {}
      }, i * 120);
      timers.push(t);
    });
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clips.length, reduced]);

  const toggleAudio = useCallback((id: string, force?: boolean) => {
    setAudioId((curr) => {
      if (force === true) return id;
      if (force === false) return curr === id ? null : curr;
      return curr === id ? null : id;
    });
  }, []);

  const handleManualPlay = useCallback((id: string) => {
    const v = videoRefs.current[id];
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  return (
    <div ref={containerRef} className={cn("w-full bg-paper", className)}>
      {/* Edge-to-edge, zero-gap row at ≥640. Mobile keeps a snap carousel. */}
      <div
        className={cn(
          "w-full",
          "flex gap-0 overflow-x-auto snap-x snap-mandatory",
          "scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "sm:gap-0 sm:overflow-visible sm:snap-none",
        )}
      >
        {clips.map((clip, i) => {
          const isOuter = i === 0 || i === clips.length - 1;
          const isLast = i === clips.length - 1;
          // Alternate parallax direction per frame (±14px range) so the
          // strip reads as a passing train, not a uniform drift.
          const dir = i % 2 === 0 ? 1 : -1;
          return (
            <FilmstripFrame
              key={clip.id}
              clip={clip}
              reduced={!!reduced}
              isHover={hoverId === clip.id}
              isAudio={audioId === clip.id}
              onHoverChange={setHoverId}
              onAudioToggle={toggleAudio}
              onManualPlay={handleManualPlay}
              registerRef={(el) => {
                videoRefs.current[clip.id] = el;
              }}
              parallaxProgress={scrollYProgress}
              parallaxDir={dir}
              className={cn(
                "shrink-0 basis-full snap-center",
                "sm:basis-0 sm:flex-1 sm:snap-align-none",
                // Bleed 1px into the next frame to defeat sub-pixel
                // rounding gaps between flex children at certain viewport
                // widths (the hairline you saw between frames 3 & 4).
                !isLast && "sm:[margin-right:-1px]",
                isOuter && "hidden lg:block",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

interface FrameProps {
  clip: FilmstripClip;
  reduced: boolean;
  isHover: boolean;
  isAudio: boolean;
  className?: string;
  onHoverChange: (id: string | null) => void;
  onAudioToggle: (id: string, force?: boolean) => void;
  onManualPlay: (id: string) => void;
  registerRef: (el: HTMLVideoElement | null) => void;
  parallaxProgress: MotionValue<number>;
  parallaxDir: 1 | -1;
}

function FilmstripFrame({
  clip,
  reduced,
  isHover,
  isAudio,
  className,
  onHoverChange,
  onAudioToggle,
  onManualPlay,
  registerRef,
  parallaxProgress,
  parallaxDir,
}: FrameProps) {
  const [loaded, setLoaded] = useState(false);
  const hasVideo = !!clip.src?.mp4 || !!clip.src?.webm;
  // Inner image drifts ±14px against its frame edge across the strip's
  // viewport pass. Disabled for reduced-motion.
  const innerY = useTransform(
    parallaxProgress,
    [0, 1],
    reduced ? [0, 0] : [-14 * parallaxDir, 14 * parallaxDir],
  );

  return (
    <div className={cn("flex flex-col", className)}>
      <figure
        className={cn(
          "relative overflow-hidden bg-[#f1f1f1]",
          "aspect-[3/4]",
        )}
        onMouseEnter={() => {
          if (reduced) return;
          onHoverChange(clip.id);
          // Hover-to-unmute on desktop. (Browser still requires a prior
          // page-level gesture; HeroFilmstrip handles that unlock.)
          onAudioToggle(clip.id, true);
        }}
        onMouseLeave={() => {
          if (reduced) return;
          onHoverChange(null);
          onAudioToggle(clip.id, false);
        }}
        onClick={() => {
          // Touch / no-hover devices: tap toggles audio on this frame.
          if (typeof window !== "undefined" && window.matchMedia("(hover: none)").matches) {
            onAudioToggle(clip.id);
          }
        }}
      >
        {/* Always-on poster underlay. Stays visible until the video paints
            its first frame, so we never flash a grey skeleton. Wrapped in a
            motion layer that drifts ±14px so the photograph has weight inside
            its frame as you scroll past. The wrapper is intentionally taller
            than the figure so the drift never exposes an edge. */}
        <motion.div
          aria-hidden
          className="absolute inset-x-0 -top-4 -bottom-4"
          style={{ y: innerY, willChange: "transform" }}
        >
          {clip.poster && (
            <img
              src={clip.poster}
              alt=""
              aria-hidden
              loading="eager"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}

          {hasVideo ? (
            <video
              ref={registerRef}
              poster={clip.poster}
              muted
              loop
              autoPlay
              playsInline
              preload="auto"
              aria-label={clip.label}
              className={cn(
                "relative h-full w-full object-cover transition-opacity duration-700",
                loaded ? "opacity-100" : "opacity-0",
              )}
              onLoadedData={(e) => {
                setLoaded(true);
                e.currentTarget.play().catch(() => {});
              }}
            >
              {clip.src?.webm && <source src={clip.src.webm} type="video/webm" />}
              {clip.src?.mp4 && <source src={clip.src.mp4} type="video/mp4" />}
            </video>
          ) : (
            <img
              src={clip.poster}
              alt={clip.label ?? ""}
              loading="lazy"
              decoding="async"
              className={cn(
                "h-full w-full object-cover transition-opacity duration-700",
                loaded ? "opacity-100" : "opacity-0",
              )}
              onLoad={() => setLoaded(true)}
              onError={() => setLoaded(true)}
            />
          )}
        </motion.div>

        {/* mute toggle removed — clips stay muted on home */}

        {hasVideo && reduced && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onManualPlay(clip.id);
            }}
            aria-label="Play clip"
            className="absolute inset-0 z-10 flex items-center justify-center bg-charcoal/0 transition-colors hover:bg-charcoal/10"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-charcoal/70 text-paper">
              <Play className="h-5 w-5" />
            </span>
          </button>
        )}
      </figure>

      {/* Caption — sits beneath the frame, bottom-left aligned with a small gutter */}
      <figcaption
        className="mt-2 md:mt-3 px-3 md:px-4 flex items-baseline gap-1.5 font-brand text-charcoal"
        style={{ fontWeight: 400 }}
      >
        <span
          className="text-[10px] md:text-[11px] tracking-[0.18em] text-charcoal/55"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {clip.id}
        </span>
        <span className="text-[11px] md:text-[13px] uppercase tracking-[0.22em]">
          {clip.season}
        </span>
      </figcaption>
    </div>
  );
}
