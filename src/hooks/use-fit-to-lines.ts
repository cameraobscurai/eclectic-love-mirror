import { useEffect, useState } from "react";
import {
  prepareWithSegments,
  measureLineStats,
  type PreparedTextWithSegments,
} from "@chenglou/pretext";

interface UseFitToLinesOptions {
  text: string;
  /** Available width in CSS px for the title to wrap inside. */
  maxWidth: number;
  /** Pretext font name. Must be a NAMED loaded font (not a CSS stack, not system-ui). */
  family?: string;
  /** CSS weight string used inside the canvas font shorthand. */
  weight?: string | number;
  /** Largest font size we'll consider (px). */
  maxPx?: number;
  /** Smallest font size we'll consider (px). */
  minPx?: number;
  /** How many lines we want the title to wrap into, max. */
  targetLines?: number;
  /** Pixel-precision for the binary search. 1 = whole pixels. */
  step?: number;
  /** CSS letter-spacing in px to keep measurement honest. */
  letterSpacingPx?: number;
}

/**
 * Pretext-backed binary search for the largest font size that wraps `text`
 * into at most `targetLines` lines inside `maxWidth`.
 *
 * Returns null until fonts are loaded + measurement runs (caller falls back
 * to a CSS clamp() in the meantime). Re-runs whenever text or maxWidth changes.
 *
 * Why Pretext: zero DOM measurement, no forced reflow, accurate to the browser's
 * own canvas font engine. See @chenglou/pretext README — this is the
 * "binary search a nice width" pattern called out for balanced text.
 */
export function useFitToLines({
  text,
  maxWidth,
  family = "Cormorant",
  weight = 400,
  maxPx = 128,
  minPx = 32,
  targetLines = 2,
  step = 1,
  letterSpacingPx = 0,
}: UseFitToLinesOptions): number | null {
  const [size, setSize] = useState<number | null>(null);

  useEffect(() => {
    // SSR / no-canvas / no-Intl.Segmenter guard
    if (typeof window === "undefined") return;
    if (!text || maxWidth <= 0) {
      setSize(null);
      return;
    }

    let cancelled = false;

    const measure = () => {
      if (cancelled) return;

      // Cache prepared per size — Pretext recommends NOT re-running prepare()
      // for the same text + font combo. We bump font size in the font string
      // so each size gets its own prepared handle, but we cache within this
      // measurement pass.
      const cache = new Map<number, PreparedTextWithSegments>();
      const prep = (px: number): PreparedTextWithSegments => {
        let p = cache.get(px);
        if (!p) {
          p = prepareWithSegments(
            text,
            `${weight} ${px}px "${family}"`,
            letterSpacingPx ? { letterSpacing: letterSpacingPx } : undefined,
          );
          cache.set(px, p);
        }
        return p;
      };

      // Binary search: largest px in [minPx, maxPx] where lineCount <= targetLines.
      let lo = minPx;
      let hi = maxPx;
      let best = minPx;

      // Quick check: does maxPx already fit? If so, we're done.
      const topStats = measureLineStats(prep(hi), maxWidth);
      if (topStats.lineCount <= targetLines) {
        best = hi;
      } else {
        // Standard binary search at `step` precision.
        while (hi - lo > step) {
          const mid = Math.floor((lo + hi) / 2);
          const stats = measureLineStats(prep(mid), maxWidth);
          if (stats.lineCount <= targetLines) {
            best = mid;
            lo = mid;
          } else {
            hi = mid;
          }
        }
      }

      if (!cancelled) setSize(best);
    };

    // Pretext caveat: measurements are wrong if the named font hasn't loaded.
    // document.fonts.ready resolves once all CSS-declared fonts are available.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measure);
    } else {
      measure();
    }

    return () => {
      cancelled = true;
    };
  }, [text, maxWidth, family, weight, maxPx, minPx, targetLines, step, letterSpacingPx]);

  return size;
}
