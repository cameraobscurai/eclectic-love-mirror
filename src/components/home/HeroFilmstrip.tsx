import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useScroll, useTransform, useReducedMotion, type MotionValue } from "framer-motion";
import { Play, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { acquireScrollLock } from "@/lib/scroll-lock";
import { HERO_CLIPS, type FilmstripClip } from "./clips";

/**
 * HeroFilmstrip
 * -------------
 * Five vertical 3:4 frames sitting on flat white. Each frame plays muted in
 * the strip; clicking a frame opens a centered lightbox where the same clip
 * plays with audio. Closing the lightbox returns to the silent strip.
 */

interface HeroFilmstripProps {
  clips?: FilmstripClip[];
  className?: string;
}

export function HeroFilmstrip({ clips = HERO_CLIPS, className }: HeroFilmstripProps) {
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [inView, setInView] = useState(true);

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
    });
  }, [inView]);

  // Strip videos always stay muted. Lightbox handles its own audio.
  useEffect(() => {
    if (reduced) return;
    Object.values(videoRefs.current).forEach((v) => {
      if (!v) return;
      v.muted = true;
      if (lightboxId && inView) v.pause();
      else if (inView) v.play().catch(() => {});
    });
  }, [lightboxId, reduced, inView]);

  // Stagger initial loads so browsers don't throttle 5 concurrent downloads.
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

  const activeClip = clips.find((c) => c.id === lightboxId) ?? null;

  return (
    <div ref={containerRef} className={cn("w-full bg-paper", className)}>
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
          const dir = i % 2 === 0 ? 1 : -1;
          return (
            <FilmstripFrame
              key={clip.id}
              clip={clip}
              reduced={!!reduced}
              isHover={hoverId === clip.id}
              onHoverChange={setHoverId}
              onOpen={() => setLightboxId(clip.id)}
              onManualPlay={handleManualPlay}
              registerRef={(el) => {
                videoRefs.current[clip.id] = el;
              }}
              parallaxProgress={scrollYProgress}
              parallaxDir={dir}
              className={cn(
                "shrink-0 basis-full snap-center",
                "sm:basis-0 sm:flex-1 sm:snap-align-none",
                !isLast && "sm:[margin-right:-1px]",
                isOuter && "hidden lg:block",
              )}
            />
          );
        })}
      </div>

      <Lightbox clip={activeClip} onClose={() => setLightboxId(null)} />
    </div>
  );
}

interface FrameProps {
  clip: FilmstripClip;
  reduced: boolean;
  isHover: boolean;
  className?: string;
  onHoverChange: (id: string | null) => void;
  onOpen: () => void;
  onManualPlay: (id: string) => void;
  registerRef: (el: HTMLVideoElement | null) => void;
  parallaxProgress: MotionValue<number>;
  parallaxDir: 1 | -1;
}

function FilmstripFrame({
  clip,
  reduced,
  isHover,
  className,
  onHoverChange,
  onOpen,
  onManualPlay,
  registerRef,
  parallaxProgress,
  parallaxDir,
}: FrameProps) {
  const [loaded, setLoaded] = useState(false);
  const hasVideo = !!clip.src?.mp4 || !!clip.src?.webm;
  const innerY = useTransform(
    parallaxProgress,
    [0, 1],
    reduced ? [0, 0] : [-14 * parallaxDir, 14 * parallaxDir],
  );

  return (
    <div className={cn("flex flex-col", className)}>
      <figure
        className={cn(
          "group relative overflow-hidden bg-[#f1f1f1] cursor-pointer",
          "aspect-[3/4]",
        )}
        onMouseEnter={() => onHoverChange(clip.id)}
        onMouseLeave={() => onHoverChange(null)}
        onClick={() => {
          if (reduced) return;
          onOpen();
        }}
        role="button"
        tabIndex={0}
        aria-label={`Play ${clip.label ?? clip.season} with sound`}
        onKeyDown={(e) => {
          if (reduced) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
      >
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

        {/* Subtle hover affordance — a faint vignette + tiny play glyph
            that fades in. No icon clutter at rest. */}
        {hasVideo && !reduced && (
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 flex items-center justify-center",
              "bg-gradient-to-t from-charcoal/20 via-transparent to-transparent",
              "opacity-0 transition-opacity duration-500",
              "group-hover:opacity-100",
            )}
          >
            <span
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full",
                "bg-paper/85 text-charcoal backdrop-blur-sm",
                "translate-y-1 transition-transform duration-500",
                "group-hover:translate-y-0",
              )}
            >
              <Play className="h-4 w-4 translate-x-[1px]" fill="currentColor" />
            </span>
          </div>
        )}

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

/* -------------------------------------------------------------------------- */
/* Lightbox                                                                   */
/* -------------------------------------------------------------------------- */

interface LightboxProps {
  clip: FilmstripClip | null;
  onClose: () => void;
}

function Lightbox({ clip, onClose }: LightboxProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Body scroll lock + ESC to close while open.
  useEffect(() => {
    if (!clip) return;
    const release = acquireScrollLock();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      release();
      window.removeEventListener("keydown", onKey);
    };
  }, [clip, onClose]);

  // Fade audio in when the lightbox video is ready.
  useEffect(() => {
    if (!clip) return;
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.muted = false;
    v.volume = 0;
    const start = performance.now();
    const DURATION = 420;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / DURATION, 1);
      v.volume = t;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    v.play()
      .then(() => {
        raf = requestAnimationFrame(tick);
      })
      .catch(() => {
        // Autoplay-with-audio rejected — fall back to muted, user can unmute via controls.
        v.muted = true;
        v.play().catch(() => {});
      });
    return () => {
      cancelAnimationFrame(raf);
      v.pause();
      v.muted = true;
    };
  }, [clip]);

  return (
    <AnimatePresence>
      {clip && (
        <motion.div
          key="lightbox"
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 0.61, 0.36, 1] }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`${clip.season} — playing with sound`}
        >
          {/* Deeper scrim — the frame should be the only thing on screen. */}
          <div className="absolute inset-0 bg-charcoal/95 backdrop-blur-lg" />

          <motion.figure
            className="relative z-10 flex flex-col items-center"
            initial={{ scale: 0.96, y: 8, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            transition={{ duration: 0.42, ease: [0.22, 0.61, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cap height to leave room for caption (~42px) + outer padding,
                and cap width on narrow screens so 3:4 never overflows. */}
            <div
              className="relative overflow-hidden bg-charcoal aspect-[3/4]"
              style={{
                height: "min(calc(100vh - 8rem), calc((100vw - 4rem) * 4 / 3))",
                boxShadow: "0 40px 120px -40px rgba(0,0,0,0.7)",
              }}
            >
              <video
                ref={videoRef}
                poster={clip.poster}
                loop
                playsInline
                preload="auto"
                aria-label={clip.label}
                className="h-full w-full object-cover"
              >
                {clip.src?.webm && <source src={clip.src.webm} type="video/webm" />}
                {clip.src?.mp4 && <source src={clip.src.mp4} type="video/mp4" />}
              </video>
            </div>

            <figcaption
              className="mt-3 flex items-baseline justify-center gap-2 font-brand text-paper/80"
              style={{ fontWeight: 400 }}
            >
              <span
                className="text-[10px] tracking-[0.22em] text-paper/55"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {clip.id}
              </span>
              <span className="text-[12px] uppercase tracking-[0.28em]">{clip.season}</span>
            </figcaption>
          </motion.figure>

          {/* Close — hairline glyph in the top-right of the viewport. */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close"
            className={cn(
              "absolute top-5 right-5 z-20 flex h-10 w-10 items-center justify-center",
              "rounded-full text-paper/80 transition-colors hover:text-paper hover:bg-paper/10",
            )}
          >
            <X className="h-4 w-4" strokeWidth={1.25} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
