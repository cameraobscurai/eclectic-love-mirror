import { useEffect, useState } from "react";
import {
  prepareWithSegments,
  measureLineStats,
  measureNaturalWidth,
  type PreparedTextWithSegments,
} from "@chenglou/pretext";

/**
 * Find the column width that simultaneously:
 *   1. Holds a headline whose longest forced line measures `headlineWidth` px,
 *      and
 *   2. Wraps `bodyText` into exactly `bodyTargetLines` lines.
 *
 * Returns max(headlineWidth, bodyMinWidth) — the tightest column where both
 * constraints hold. Re-measures whenever inputs change.
 *
 * Body font is fixed (px) — caller provides the resolved px size, weight,
 * family, and letter-spacing in px (CSS letter-spacing must match here or
 * pretext's measurement is wrong; e.g. tracking-[0.18em] @ 12px = 2.16px).
 *
 * Headline width is measured by the caller (ResizeObserver on the rendered
 * h1) because the headline uses CSS clamp() and its computed font size
 * changes with viewport — feeding pretext a stale px would lie.
 */
export function useBalancedColumnWidth({
  bodyText,
  bodyFontPx,
  bodyFontFamily = "Inter",
  bodyFontWeight = 400,
  bodyLetterSpacingPx = 0,
  bodyTargetLines = 2,
  headlineWidth,
}: {
  bodyText: string;
  bodyFontPx: number;
  bodyFontFamily?: string;
  bodyFontWeight?: string | number;
  bodyLetterSpacingPx?: number;
  bodyTargetLines?: number;
  headlineWidth: number;
}): number | null {
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!bodyText || headlineWidth <= 0 || bodyFontPx <= 0) return;

    let cancelled = false;

    const measure = () => {
      if (cancelled) return;
      const prepared: PreparedTextWithSegments = prepareWithSegments(
        bodyText,
        `${bodyFontWeight} ${bodyFontPx}px "${bodyFontFamily}"`,
        bodyLetterSpacingPx ? { letterSpacing: bodyLetterSpacingPx } : undefined,
      );

      // Body's natural (single-line) width — upper bound of our search.
      const naturalW = measureNaturalWidth(prepared);
      // If the body already fits in <= targetLines at headlineWidth, we're done.
      const atHeadline = measureLineStats(prepared, headlineWidth);
      if (atHeadline.lineCount <= bodyTargetLines) {
        if (!cancelled) setWidth(headlineWidth);
        return;
      }

      // Binary search the smallest width in [headlineWidth, naturalW] where
      // body fits in <= targetLines.
      let lo = headlineWidth;
      let hi = Math.ceil(naturalW);
      let best = hi;
      while (hi - lo > 1) {
        const mid = Math.floor((lo + hi) / 2);
        const stats = measureLineStats(prepared, mid);
        if (stats.lineCount <= bodyTargetLines) {
          best = mid;
          hi = mid;
        } else {
          lo = mid;
        }
      }
      if (!cancelled) setWidth(best);
    };

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measure);
    } else {
      measure();
    }
    return () => {
      cancelled = true;
    };
  }, [
    bodyText,
    bodyFontPx,
    bodyFontFamily,
    bodyFontWeight,
    bodyLetterSpacingPx,
    bodyTargetLines,
    headlineWidth,
  ]);

  return width;
}
