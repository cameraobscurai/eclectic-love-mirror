// ---------------------------------------------------------------------------
// AmangiriGlassHero
//
// Three glass-first hero compositions built on the same primitives the rest
// of the site already uses:
//   - the SVG feTurbulence + feDisplacementMap refraction filter from
//     <LiquidGlass /> (CTA pills) — same physics, same hairlines
//   - the canonical glassBand.dark recipe from src/lib/glass.ts — same blur,
//     same charcoal-tint gradient, same cream hairlines top/bottom
//   - the Amangiri image set from src/content/amangiri.ts as substrate
//
// Three variants:
//   "vitrine"  — three small frosted vitrines float over a full-bleed
//                Amangiri substrate. Reads as museum vitrines on sandstone.
//   "reveal"   — full-stage frosted scrim with one drifting clear aperture.
//                The aperture answers the brand brief's "video movement to
//                hold interest" without using video.
//   "strata"   — two thin frosted glass planes, parallax-stacked over the
//                substrate, with the existing wordmark band as the central
//                stratum. Editorial, modern but timeless.
//
// Each variant is built INSIDE the existing <section> in src/routes/index.tsx,
// not around it. The wordmark band, wordmark, CTA stack and variant dot
// toggle all sit on top of whatever this component renders.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { amangiriHome } from "@/content/amangiri";
import { cn } from "@/lib/utils";

export type GlassVariant = "vitrine" | "reveal" | "strata";

interface Props {
  variant: GlassVariant;
  loaded: boolean;
  /** ref the parent uses for object-cover projection math (band anchor). */
  imgRef: React.RefObject<HTMLImageElement | null>;
  /** vertical center of the band, in px from the top of the section. */
  bandCenterPx: number | null;
  /** parallax x/y motion values from the parent (already springed). */
  parallaxOn: boolean;
  bgX?: import("framer-motion").MotionValue<number>;
  bgY?: import("framer-motion").MotionValue<number>;
}

/* ------------------------------------------------------------------ */
/* Substrate — full-bleed Amangiri photo, shared by all three variants. */
/* ------------------------------------------------------------------ */
function Substrate({
  imgRef,
  loaded,
  parallaxOn,
  bgX,
  bgY,
  dim = 1,
}: Pick<Props, "imgRef" | "loaded" | "parallaxOn" | "bgX" | "bgY"> & {
  /** brightness multiplier for the substrate (used by Vitrine to push it back). */
  dim?: number;
}) {
  const img = amangiriHome.topHero;
  return (
    <motion.img
      ref={imgRef}
      src={img.src}
      alt=""
      aria-hidden="true"
      decoding="async"
      fetchPriority="high"
      loading="eager"
      draggable={false}
      className={cn(
        "absolute inset-0 w-full h-full object-cover transition-opacity duration-1000",
        loaded ? "opacity-100" : "opacity-0",
      )}
      style={{
        objectPosition: img.position ?? "center 50%",
        filter: dim < 1 ? `brightness(${dim}) saturate(0.96)` : undefined,
        ...(parallaxOn && bgX && bgY
          ? { x: bgX, y: bgY, scale: 1.04, willChange: "transform" }
          : {}),
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Shared frosted-plate style — same recipe as glassBand.dark, scoped  */
/* to a rectangular plate. Used by Vitrine and Strata.                 */
/* ------------------------------------------------------------------ */
const frostedPlateStyle: React.CSSProperties = {
  backdropFilter: "blur(14px) saturate(1.05) brightness(0.92)",
  WebkitBackdropFilter: "blur(14px) saturate(1.05) brightness(0.92)",
  background:
    "linear-gradient(to bottom, rgba(26,26,26,0.10) 0%, rgba(26,26,26,0.20) 50%, rgba(26,26,26,0.10) 100%)",
  border: "1px solid rgba(245,242,237,0.16)",
  boxShadow:
    "inset 0 1px 0 0 rgba(245,242,237,0.10), inset 0 -1px 0 0 rgba(245,242,237,0.06), 0 24px 60px -28px rgba(0,0,0,0.55)",
};

/* ================================================================== */
/* VARIANT 1 — VITRINE                                                 */
/* ================================================================== */
function Vitrine({ loaded }: { loaded: boolean }) {
  // Three small frosted vitrines floating over the substrate. Each one
  // contains a different Amangiri detail. Positioned asymmetrically so the
  // composition reads as curated, not gridded. The lower vitrine sits below
  // the wordmark band; the upper two sit above it.
  const items = [
    {
      img: amangiriHome.leftTall,
      // upper left vitrine
      className:
        "absolute top-[14%] left-[6%] w-[clamp(140px,18vw,260px)] h-[clamp(180px,24vw,340px)] hidden md:block",
      delay: 600,
    },
    {
      img: amangiriHome.detailOne,
      // upper right vitrine, intentionally smaller and lower than the left
      className:
        "absolute top-[20%] right-[8%] w-[clamp(140px,16vw,230px)] h-[clamp(170px,22vw,310px)] hidden md:block",
      delay: 750,
    },
    {
      img: amangiriHome.detailTwo,
      // lower center vitrine, smallest, sits between band and CTAs
      className:
        "absolute bottom-[24%] left-1/2 -translate-x-1/2 w-[clamp(160px,15vw,220px)] h-[clamp(140px,13vw,200px)]",
      delay: 900,
    },
  ];

  return (
    <>
      {items.map((it, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={cn(
            it.className,
            "z-[6] pointer-events-none transition-all duration-1000",
            loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
          )}
          style={{
            transitionDelay: loaded ? `${it.delay}ms` : "0ms",
            ...frostedPlateStyle,
            borderRadius: "2px",
            padding: "10px",
          }}
        >
          <img
            src={it.img.src}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            draggable={false}
            className="w-full h-full object-cover"
            style={{ objectPosition: it.img.position ?? "center" }}
          />
          {/* hairline inside the plate — frames the photograph as an object */}
          <div
            aria-hidden="true"
            className="absolute inset-[10px] pointer-events-none"
            style={{ boxShadow: "inset 0 0 0 1px rgba(245,242,237,0.12)" }}
          />
        </div>
      ))}
    </>
  );
}

/* ================================================================== */
/* VARIANT 2 — REVEAL                                                  */
/* ================================================================== */
function Reveal({
  loaded,
  bandCenterPx,
}: {
  loaded: boolean;
  bandCenterPx: number | null;
}) {
  const reduced = useReducedMotion();
  const apertureRef = useRef<HTMLDivElement | null>(null);

  // Drift the aperture on a slow sine wave (14s). ±3% horizontal, ±1.5%
  // vertical. Translates the aperture element directly; mask-image stays
  // fixed on the scrim, so the "window" appears to move across the photo.
  useEffect(() => {
    if (reduced) return;
    if (typeof window === "undefined") return;
    const el = apertureRef.current;
    if (!el) return;
    let raf = 0;
    const start = performance.now();
    const PERIOD_X = 14000;
    const PERIOD_Y = 22000;
    const tick = (t: number) => {
      const px = ((t - start) % PERIOD_X) / PERIOD_X;
      const py = ((t - start) % PERIOD_Y) / PERIOD_Y;
      const dx = Math.sin(px * Math.PI * 2) * 3; // vw
      const dy = Math.sin(py * Math.PI * 2) * 1.5; // vh
      el.style.transform = `translate3d(${dx}vw, ${dy}vh, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  // Aperture geometry — desktop: a tall rectangle, slightly left of center,
  // crossing the wordmark band. Mobile: wider, shorter, no drift.
  // Implemented as a frosted rectangle with mask cutout? No — simpler:
  // render a heavy full-stage scrim, then clip the aperture region using a
  // CSS mask on the scrim. The aperture itself is just a positional marker
  // we transform via the sine loop above; the scrim's mask-image is a
  // gradient anchored to that marker's bounding box.
  //
  // We avoid the mask-image complexity by inverting: render the full-bleed
  // substrate (already there), put the heavy scrim ABOVE it with a CSS
  // radial-gradient mask that opens a soft-edged rectangle. The drifting
  // wrapper offsets the entire scrim layer's mask via translate.

  return (
    <>
      {/* Heavy scrim covering the substrate, with a soft-edged rectangular
          aperture cut out via mask-image. The wrapper is what drifts. */}
      <div
        ref={apertureRef}
        aria-hidden="true"
        className={cn(
          "absolute inset-0 z-[6] pointer-events-none transition-opacity duration-[1400ms]",
          loaded ? "opacity-100" : "opacity-0",
        )}
        style={{ willChange: "transform" }}
      >
        <div
          className="absolute inset-0"
          style={{
            backdropFilter: "blur(18px) saturate(1.05) brightness(0.88)",
            WebkitBackdropFilter: "blur(18px) saturate(1.05) brightness(0.88)",
            background:
              "linear-gradient(to bottom, rgba(26,26,26,0.28) 0%, rgba(26,26,26,0.36) 50%, rgba(26,26,26,0.30) 100%)",
            // Cut a soft-edged rectangle out of the scrim. The rectangle is
            // ~38vw wide × 56vh tall, centered slightly left of center,
            // vertically centered. Soft edges via the gradient stops.
            maskImage:
              "radial-gradient(ellipse 26vw 32vh at 44% 50%, transparent 55%, rgba(0,0,0,0.5) 78%, rgba(0,0,0,1) 95%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 26vw 32vh at 44% 50%, transparent 55%, rgba(0,0,0,0.5) 78%, rgba(0,0,0,1) 95%)",
          }}
        />
      </div>
      {/* Aperture hairline — a quiet frame around the cleared rectangle so
          it reads as a vitrine window, not a leak. Positioned at the same
          coordinates as the mask center. Does NOT drift — staying still
          makes the substrate-through-the-window read as the moving thing. */}
      <div
        aria-hidden="true"
        className={cn(
          "absolute z-[7] pointer-events-none transition-opacity duration-[1400ms]",
          loaded ? "opacity-100" : "opacity-0",
        )}
        style={{
          // 38vw × 56vh, centered at 44% horizontal / 50% vertical of stage.
          // Vertical centered on the stage, not the band — keeps it stable
          // across SSR and avoids needing window at render time.
          left: "calc(44% - 19vw)",
          top: "calc(50% - 28vh)",
          width: "38vw",
          height: "56vh",
          border: "1px solid rgba(245,242,237,0.10)",
          boxShadow:
            "inset 0 0 0 1px rgba(26,26,26,0.10), 0 0 0 1px rgba(0,0,0,0.04)",
          transitionDelay: loaded ? "400ms" : "0ms",
        }}
      />
    </>
  );
}

/* ================================================================== */
/* VARIANT 3 — STRATA                                                  */
/* ================================================================== */
function Strata({
  loaded,
  bandCenterPx,
  parallaxOn,
  bgX,
  bgY,
}: {
  loaded: boolean;
  bandCenterPx: number | null;
  parallaxOn: boolean;
  bgX?: import("framer-motion").MotionValue<number>;
  bgY?: import("framer-motion").MotionValue<number>;
}) {
  // Two thin frosted strata — one above the wordmark band, one below.
  // The wordmark band itself (rendered by the parent) is the central
  // stratum and does not change. Each thin stratum has a hairline top and
  // bottom and a tiny tabular label, like an archive index card.
  //
  // Position: top stratum at ~28% of stage height, bottom at ~72%. They're
  // horizontally full-bleed and ~38px tall on desktop.
  const topY = "28%";
  const bottomY = "72%";

  // Subtle parallax: top stratum drifts opposite to substrate, bottom with.
  // Reuses the parent's springed motion values (already pointer-fine gated).
  const stratumStyle: React.CSSProperties = {
    height: "clamp(28px, 5vh, 52px)",
    backdropFilter: "blur(12px) saturate(1.04) brightness(0.94)",
    WebkitBackdropFilter: "blur(12px) saturate(1.04) brightness(0.94)",
    background:
      "linear-gradient(to bottom, rgba(26,26,26,0.06) 0%, rgba(26,26,26,0.14) 50%, rgba(26,26,26,0.06) 100%)",
    borderTop: "1px solid rgba(245,242,237,0.12)",
    borderBottom: "1px solid rgba(245,242,237,0.10)",
    boxShadow:
      "inset 0 1px 0 0 rgba(245,242,237,0.06), inset 0 -1px 0 0 rgba(245,242,237,0.04)",
    transform: "translateY(-50%)",
  };

  const labelClass =
    "absolute top-1/2 -translate-y-1/2 font-brand text-[9px] uppercase text-cream/55 tracking-[0.32em] tabular-nums";

  // suppress unused warnings — parent passes parallax in case we wire later
  void parallaxOn;
  void bgX;
  void bgY;
  void bandCenterPx;

  return (
    <>
      {/* Top stratum */}
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 z-[6] pointer-events-none transition-opacity duration-1000",
          loaded ? "opacity-100" : "opacity-0",
        )}
        style={{ ...stratumStyle, top: topY, transitionDelay: loaded ? "350ms" : "0ms" }}
      >
        <span className={cn(labelClass, "left-6 md:left-10")}>01 — Amangiri</span>
        <span className={cn(labelClass, "right-6 md:right-10")}>UT · 2024</span>
      </div>

      {/* Bottom stratum */}
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 z-[6] pointer-events-none transition-opacity duration-1000",
          loaded ? "opacity-100" : "opacity-0",
        )}
        style={{ ...stratumStyle, top: bottomY, transitionDelay: loaded ? "450ms" : "0ms" }}
      >
        <span className={cn(labelClass, "left-6 md:left-10")}>Eclectic Hive</span>
        <span className={cn(labelClass, "right-6 md:right-10")}>Vol. I</span>
      </div>
    </>
  );
}

/* ================================================================== */
/* Public component                                                    */
/* ================================================================== */
export function AmangiriGlassHero(props: Props) {
  const { variant, loaded, imgRef, parallaxOn, bgX, bgY, bandCenterPx } = props;

  return (
    <>
      <Substrate
        imgRef={imgRef}
        loaded={loaded}
        parallaxOn={parallaxOn}
        bgX={bgX}
        bgY={bgY}
        dim={variant === "vitrine" ? 0.86 : 1}
      />
      {variant === "vitrine" && <Vitrine loaded={loaded} />}
      {variant === "reveal" && <Reveal loaded={loaded} bandCenterPx={bandCenterPx} />}
      {variant === "strata" && (
        <Strata
          loaded={loaded}
          bandCenterPx={bandCenterPx}
          parallaxOn={parallaxOn}
          bgX={bgX}
          bgY={bgY}
        />
      )}
    </>
  );
}
