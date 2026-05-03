import { useState, useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { LiquidGlass } from "@/components/liquid-glass";
import { AmangiriGlassHero, type GlassVariant } from "@/components/home/AmangiriGlassHero";
import { cn } from "@/lib/utils";
import { useObjectCoverPoint } from "@/hooks/useObjectCoverPoint";
import homeHero from "@/assets/home-hero.webp";
import homeHeroAvif from "@/assets/home-hero.avif";
import homeHeroMobileWebp from "@/assets/home-hero-mobile.webp";
import homeHeroMobileAvif from "@/assets/home-hero-mobile.avif";
import homeHeroExploded from "@/assets/hero-exploded-glass.png";

// Five hero variants. Picked at random on each page load for a quieter
// "the site is alive" feel; visitor can flip with the corner control.
//   moodboard / exploded — original baked-image compositions
//   vitrine / reveal / strata — glass-first compositions over the Amangiri
//   substrate (see AmangiriGlassHero.tsx for the actual recipes)
type HeroVariant = "moodboard" | "exploded" | GlassVariant;
const ALL_VARIANTS: HeroVariant[] = ["moodboard", "exploded", "vitrine", "reveal", "strata"];

// --- Wordmark tunables (single source of truth) ---
const BAND_CENTER_RATIO = 0.47;   // vertical fraction of source image where the glass band centers
const COUNTER_DRIFT_X = 2;        // px max horizontal counter-drift
const COUNTER_DRIFT_Y = 1.5;      // px max vertical counter-drift
const SPECULAR_RADIUS = 4;        // px shadow offset radius
const BREATH_AMPLITUDE = 0.005;   // em
const BREATH_PERIOD = 9000;       // ms
const BASE_LETTER_SPACING = 0.32; // em

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ECLECTIC HIVE — Luxury Event Design & Production | Denver" },
      {
        name: "description",
        content:
          "Two parts luxe, one part regal, and a dash of edge. Full-service luxury event design, custom fabrication, and furniture rentals in Denver, Colorado.",
      },
      { property: "og:title", content: "ECLECTIC HIVE — Luxury Event Design & Production" },
      {
        property: "og:description",
        content:
          "Cinematic, art-forward environments for weddings, galas, and corporate events.",
      },
    ],
    links: [
      // LCP image preload — separate entries per breakpoint so the browser
      // fetches only the asset that matches the current viewport. AVIF
      // first, fall back implicitly to <picture> sources for non-AVIF UAs.
      {
        rel: "preload",
        as: "image",
        href: homeHeroMobileAvif,
        type: "image/avif",
        media: "(max-width: 767px)",
        fetchpriority: "high",
      },
      {
        rel: "preload",
        as: "image",
        href: homeHeroAvif,
        type: "image/avif",
        media: "(min-width: 768px)",
        fetchpriority: "high",
      },
    ],
  }),
  component: HomePage,
});

const DESTINATIONS = [
  { href: "/atelier", label: "The Design House", title: "Atelier" },
  { href: "/collection", label: "Hive Signature Collection", title: "Collection" },
  { href: "/gallery", label: "Selected Works", title: "Gallery" },
] as const;

function HomePage() {
  const [loaded, setLoaded] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isPointerFine, setIsPointerFine] = useState(false);
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);
  const heroImgRef = useRef<HTMLImageElement | null>(null);

  // Random hero variant per page load. SSR renders "moodboard" deterministically;
  // a client effect picks a random variant after hydration. The corner control
  // lets the visitor flip manually.
  const [variant, setVariant] = useState<HeroVariant>("moodboard");
  useEffect(() => {
    setVariant(ALL_VARIANTS[Math.floor(Math.random() * ALL_VARIANTS.length)]);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(pointer: fine)");
    const update = () => setIsPointerFine(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  // Anchor the wordmark to the glass band feature inside the artwork.
  const bandPoint = useObjectCoverPoint(heroImgRef, 0.5, BAND_CENTER_RATIO);

  // Normalized pointer offsets in range [-0.5, 0.5], local to the hero section.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  // Background — soft, follows cursor (positive depth).
  const bgSpringX = useSpring(mx, { stiffness: 60, damping: 25, mass: 0.6 });
  const bgSpringY = useSpring(my, { stiffness: 60, damping: 25, mass: 0.6 });
  const bgX = useTransform(bgSpringX, [-0.5, 0.5], [-18, 18]);
  const bgY = useTransform(bgSpringY, [-0.5, 0.5], [-12, 12]);

  // Wordmark — heavy, slow, micro counter-drift (peripheral perception only).
  const wmSpringX = useSpring(mx, { stiffness: 50, damping: 28, mass: 0.8 });
  const wmSpringY = useSpring(my, { stiffness: 50, damping: 28, mass: 0.8 });
  const wmX = useTransform(wmSpringX, [-0.5, 0.5], [COUNTER_DRIFT_X, -COUNTER_DRIFT_X]);
  const wmY = useTransform(wmSpringY, [-0.5, 0.5], [COUNTER_DRIFT_Y, -COUNTER_DRIFT_Y]);

  // Specular highlight — cursor angle relative to wordmark center, smoothed.
  // We track unit vector components separately so the spring can interpolate
  // smoothly through (0,0) without angle wraparound jitter.
  const lightDX = useMotionValue(0);
  const lightDY = useMotionValue(1);
  const lightSpringX = useSpring(lightDX, { stiffness: 50, damping: 22, mass: 1.0 });
  const lightSpringY = useSpring(lightDY, { stiffness: 50, damping: 22, mass: 1.0 });
  const textShadow = useTransform([lightSpringX, lightSpringY], (latest) => {
    const [dx, dy] = latest as [number, number];
    const sx = -dx * SPECULAR_RADIUS;
    const sy = -dy * SPECULAR_RADIUS;
    const hx = -sx * 0.4;
    const hy = -sy * 0.4;
    return `${sx}px ${sy}px 18px rgba(26,26,26,0.28), ${hx}px ${hy}px 12px rgba(245,242,237,0.12)`;
  });

  // Breathing letter-spacing — ambient, cursor-independent.
  const letterSpacingMV = useMotionValue(`${BASE_LETTER_SPACING}em`);

  const parallaxOn = !reduced && isPointerFine;

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const phase = ((t - start) % BREATH_PERIOD) / BREATH_PERIOD;
      const offset = Math.sin(phase * Math.PI * 2) * BREATH_AMPLITUDE;
      letterSpacingMV.set(`${(BASE_LETTER_SPACING + offset).toFixed(4)}em`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, letterSpacingMV]);

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!parallaxOn) return;
    const el = sectionRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    mx.set(nx);
    my.set(ny);

    // Specular: unit vector from wordmark center to cursor.
    const cx = rect.width / 2;
    const cy = bandPoint?.y ?? rect.height / 2;
    const dx = e.clientX - rect.left - cx;
    const dy = e.clientY - rect.top - cy;
    const len = Math.hypot(dx, dy) || 1;
    lightDX.set(dx / len);
    lightDY.set(dy / len);
  };

  const handlePointerLeave = () => {
    if (!parallaxOn) return;
    mx.set(0);
    my.set(0);
    lightDX.set(0);
    lightDY.set(1);
  };

  return (
    <main
      id="main-content"
      className="bg-charcoal lg:overflow-hidden"
      style={{ overscrollBehavior: "none" }}
    >
      <section
        ref={sectionRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="relative flex flex-col overflow-hidden"
        style={{
          height: "100dvh",
          minHeight: "100dvh",
          maxHeight: "100dvh",
        }}
      >
        {/*
          Backdrop — the entire editorial composition (triptych glass plates,
          sketch + swatch moodboard, etched ECLECTIC HIVE wordmark on the
          center plate) is baked into a single image. We render it full-bleed
          and let the rest of the page (CTA bar) sit on top.

          A live <h1> remains in the DOM as sr-only so SEO and assistive tech
          still pick up the brand name even though the visible mark lives
          inside the artwork.
        */}
        {variant === "moodboard" && (
          <picture key="moodboard">
            <source
              media="(max-width: 767px)"
              srcSet={homeHeroMobileAvif}
              type="image/avif"
            />
            <source
              media="(max-width: 767px)"
              srcSet={homeHeroMobileWebp}
              type="image/webp"
            />
            <source srcSet={homeHeroAvif} type="image/avif" />
            <source srcSet={homeHero} type="image/webp" />
            <motion.img
              ref={heroImgRef}
              src={homeHero}
              alt=""
              aria-hidden="true"
              decoding="async"
              fetchPriority="high"
              loading="eager"
              className={cn(
                "absolute inset-0 w-full h-full object-cover transition-opacity duration-1000",
                "object-[50%_25%] md:object-[50%_38%]",
                loaded ? "opacity-100" : "opacity-0"
              )}
              draggable={false}
              style={
                parallaxOn
                  ? { x: bgX, y: bgY, scale: 1.04, willChange: "transform" }
                  : undefined
              }
            />
          </picture>
        )}
        {variant === "exploded" && (
          <motion.img
            key="exploded"
            ref={heroImgRef}
            src={homeHeroExploded}
            alt=""
            aria-hidden="true"
            decoding="async"
            fetchPriority="high"
            loading="eager"
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-opacity duration-1000",
              "object-[50%_50%]",
              loaded ? "opacity-100" : "opacity-0"
            )}
            draggable={false}
            style={
              parallaxOn
                ? { x: bgX, y: bgY, scale: 1.04, willChange: "transform" }
                : undefined
            }
          />
        )}
        {(variant === "vitrine" || variant === "reveal" || variant === "strata") && (
          <AmangiriGlassHero
            key={variant}
            variant={variant}
            loaded={loaded}
            imgRef={heroImgRef}
            bandCenterPx={bandPoint?.y ?? null}
            parallaxOn={parallaxOn}
            bgX={bgX}
            bgY={bgY}
          />
        )}

        {/* Edge-to-edge frosted band — sits behind the wordmark to lift
            legibility against the busy moodboard. Anchored to the same
            band point the wordmark uses, so it tracks the artwork. */}
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-x-0 z-[5] pointer-events-none transition-opacity duration-1000",
            loaded ? "opacity-100" : "opacity-0"
          )}
          style={{
            top: bandPoint?.y ?? "50%",
            height: "clamp(96px, 18vh, 180px)",
            transform: "translateY(-50%)",
            transitionDelay: loaded ? "200ms" : "0ms",
            backdropFilter: "blur(14px) saturate(1.05) brightness(0.92)",
            WebkitBackdropFilter: "blur(14px) saturate(1.05) brightness(0.92)",
            background:
              "linear-gradient(to bottom, rgba(26,26,26,0.10) 0%, rgba(26,26,26,0.20) 50%, rgba(26,26,26,0.10) 100%)",
            borderTop: "1px solid rgba(245,242,237,0.18)",
            borderBottom: "1px solid rgba(245,242,237,0.14)",
            boxShadow:
              "inset 0 1px 0 0 rgba(245,242,237,0.10), inset 0 -1px 0 0 rgba(245,242,237,0.06), 0 1px 0 0 rgba(0,0,0,0.20), 0 -1px 0 0 rgba(0,0,0,0.18)",
          }}
        />

        {/* Wordmark — anchored to the glass band baked into the artwork via
            object-cover projection math (see useObjectCoverPoint). Tunable
            from BAND_CENTER_RATIO at the top of this file. */}
        <motion.div
          aria-hidden="true"
          className={cn(
            "absolute inset-x-0 z-10 flex justify-center pointer-events-none transition-opacity duration-1000",
            loaded ? "opacity-100" : "opacity-0"
          )}
          style={{
            top: bandPoint?.y ?? "50%",
            transitionDelay: loaded ? "300ms" : "0ms",
            ...(parallaxOn
              ? { x: wmX, y: wmY, willChange: "transform" }
              : {}),
          }}
        >
          <motion.div
            className="font-brand text-cream/85 uppercase whitespace-nowrap text-center -translate-y-1/2"
            style={{
              fontWeight: 400,
              letterSpacing: reduced ? `${BASE_LETTER_SPACING}em` : letterSpacingMV,
              fontSize: "clamp(1rem, 6.2vw, 5.25rem)",
              lineHeight: 1,
              textShadow: parallaxOn
                ? textShadow
                : "0 1px 24px color-mix(in oklab, var(--charcoal) 35%, transparent)",
            }}
          >
            Eclectic&nbsp;Hive
          </motion.div>
        </motion.div>

        {/* Bottom legibility wash — keeps the LiquidGlass CTA bar readable
            against the moodboard texture without dimming the wordmark plate. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[28%] pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, transparent 0%, color-mix(in oklab, var(--charcoal) 55%, transparent) 100%)",
          }}
        />

        {/* SEO / a11y wordmark — visible mark is in the backdrop image. */}
        <h1 className="sr-only">ECLECTIC HIVE — Luxury Event Design &amp; Production</h1>

        <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-5 md:px-8 md:pb-8">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
              {DESTINATIONS.map((dest, i) => (
                <Link
                  key={dest.href}
                  to={dest.href}
                  preload="viewport"
                  aria-label={`${dest.title} — ${dest.label}`}
                  className={cn(
                    "group transition-all duration-700",
                    loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                  )}
                  style={{ transitionDelay: loaded ? `${500 + i * 100}ms` : "0ms" }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <LiquidGlass
                    hovered={hoveredIndex === i}
                    rounded="rounded-xl"
                    className={cn(
                      "py-3 px-5 md:py-3.5 md:px-7 transition-transform duration-300",
                      hoveredIndex === i && "scale-[1.015]"
                    )}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <h2
                          className={cn(
                            "font-brand text-[15px] md:text-base tracking-[0.1em] uppercase transition-colors duration-300",
                            hoveredIndex === i ? "text-cream" : "text-cream/90"
                          )}
                          style={{ fontWeight: 400 }}
                        >
                          {dest.title}
                        </h2>
                        <p
                          className={cn(
                            "text-[9px] md:text-[10px] uppercase tracking-[0.08em] transition-colors duration-300 mt-0.5",
                            hoveredIndex === i ? "text-cream/50" : "text-cream/30"
                          )}
                        >
                          {dest.label}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "flex items-center gap-1.5 shrink-0 transition-all duration-300",
                          hoveredIndex === i ? "opacity-100" : "opacity-30"
                        )}
                      >
                        <span
                          className={cn(
                            "h-px bg-cream/60 transition-all duration-300",
                            hoveredIndex === i ? "w-5" : "w-2"
                          )}
                        />
                        <svg
                          className="w-2.5 h-2.5 text-cream/70"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                          />
                        </svg>
                      </div>
                    </div>
                  </LiquidGlass>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Variant toggle — quiet bottom-right control. Two dots,
            current variant filled. Click to flip. */}
        <div className="absolute bottom-4 right-4 z-30 flex items-center gap-2">
          {(["moodboard", "exploded"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVariant(v)}
              aria-label={`Show ${v} hero`}
              aria-pressed={variant === v}
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-cream/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                variant === v
                  ? "bg-cream scale-110"
                  : "bg-cream/30 hover:bg-cream/60"
              )}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
