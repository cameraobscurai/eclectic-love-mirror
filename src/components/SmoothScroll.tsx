import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Cinematic smooth scroll. Mounts once at the root.
 * - Skips if user prefers reduced motion.
 * - Skips on touch devices (native momentum + iOS gestures already feel right).
 *
 * Tuning knobs live in `SMOOTH_SCROLL_CONFIG` below — adjust there to retune
 * the cinematic feel site-wide. Each prop is overridable via component props
 * for one-off experiments without editing the defaults.
 */

// ---- Easing presets -------------------------------------------------------
// Reusable curves so we don't sprinkle math through the codebase.
export const EASINGS = {
  // Long, exponential settle. Default cinematic feel.
  easeOutExpo: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  // Softer, slightly faster — good for shorter pages.
  easeOutQuart: (t: number) => 1 - Math.pow(1 - t, 4),
  // Gentle s-curve, symmetrical.
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  // Linear — disables easing.
  linear: (t: number) => t,
} as const;

export type EasingName = keyof typeof EASINGS;

export interface SmoothScrollConfig {
  /** Seconds for a single scroll input to fully settle. Higher = more cinematic, slower. */
  duration: number;
  /** Easing curve. Pass a preset name or a custom (t: number) => number function. */
  easing: EasingName | ((t: number) => number);
  /** Linear interpolation factor per frame. Lower = smoother + heavier. 0.05–0.15 range. */
  lerp: number;
  /** Multiplier applied to wheel deltas. 1 = native speed. */
  wheelMultiplier: number;
  /** Enable smoothing on mouse wheel input. */
  smoothWheel: boolean;
}

// Site-wide defaults — edit these to retune the cinematic feel everywhere.
export const SMOOTH_SCROLL_CONFIG: SmoothScrollConfig = {
  duration: 0.9,
  easing: "easeOutExpo",
  lerp: 0.13,
  wheelMultiplier: 1,
  smoothWheel: true,
};

export function SmoothScroll(overrides: Partial<SmoothScrollConfig> = {}) {
  const cfg: SmoothScrollConfig = { ...SMOOTH_SCROLL_CONFIG, ...overrides };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (reduced || isTouch) return;

    const easingFn =
      typeof cfg.easing === "function" ? cfg.easing : EASINGS[cfg.easing];

    const lenis = new Lenis({
      duration: cfg.duration,
      easing: easingFn,
      smoothWheel: cfg.smoothWheel,
      wheelMultiplier: cfg.wheelMultiplier,
      lerp: cfg.lerp,
    });

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
    // Re-init when any tuning value changes.
  }, [cfg.duration, cfg.easing, cfg.lerp, cfg.wheelMultiplier, cfg.smoothWheel]);

  return null;
}
