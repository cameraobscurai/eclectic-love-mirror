import { useEffect, useRef, useState, useCallback } from "react";
import { useReducedMotion } from "framer-motion";
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
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [audioId, setAudioId] = useState<string | null>(null);
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
      v.muted = true;
    });
    setAudioId(null);
  }, [inView]);

  // Autoplay every clip continuously. Hover only governs which one is unmuted later.
  useEffect(() => {
    if (reduced) return;
    Object.entries(videoRefs.current).forEach(([id, v]) => {
      if (!v) return;
      v.muted = id !== audioId;
      v.play().catch(() => {});
    });
  }, [hoverId, audioId, reduced, inView]);

  const toggleAudio = useCallback((id: string) => {
    setAudioId((curr) => (curr === id ? null : id));
  }, []);

  const handleManualPlay = useCallback((id: string) => {
    const v = videoRefs.current[id];
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

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
              className={cn(
                "shrink-0 basis-full snap-center",
                "sm:basis-0 sm:flex-1 sm:snap-align-none",
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
  onAudioToggle: (id: string) => void;
  onManualPlay: (id: string) => void;
  registerRef: (el: HTMLVideoElement | null) => void;
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
}: FrameProps) {
  const [loaded, setLoaded] = useState(false);
  const hasVideo = !!clip.src?.mp4 || !!clip.src?.webm;

  return (
    <div className={cn("flex flex-col", className)}>
      <figure
        className={cn(
          "relative overflow-hidden bg-[#f1f1f1]",
          "aspect-[3/4]",
        )}
        onMouseEnter={() => !reduced && onHoverChange(clip.id)}
        onMouseLeave={() => !reduced && onHoverChange(null)}
        onClick={() => {
          if (typeof window !== "undefined" && window.matchMedia("(hover: none)").matches) {
            onManualPlay(clip.id);
          }
        }}
      >
        {/* Always-on poster underlay. Stays visible until the video paints
            its first frame, so we never flash a grey skeleton. */}
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
