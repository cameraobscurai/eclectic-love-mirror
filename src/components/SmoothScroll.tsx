import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Cinematic smooth scroll. Mounts once at the root.
 * - Skips if user prefers reduced motion.
 * - Skips on touch devices (native momentum already feels right; Lenis on iOS
 *   can fight rubber-band + horizontal swipe gestures).
 * - Long-form luxe easing curve, ~1.1s duration.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (reduced || isTouch) return;

    const lenis = new Lenis({
      duration: 1.15,
      // easeOutExpo — long, cinematic settle
      easing: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      lerp: 0.1,
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
  }, []);

  return null;
}
