import {
  createElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
} from "react";
import { prepare, layout } from "@chenglou/pretext";

/**
 * FitText — single-line, never-truncated text that auto-sizes to fit its
 * container width.
 *
 * Why not CSS `clamp()` + `truncate`? Because the longest category labels
 * ("Mirrors & Wall Art", "Side Tables & Nightstands") will overflow narrow
 * cells at any fixed clamp setting. We use @chenglou/pretext to measure
 * exact text widths off-DOM (no reflow), then binary-search the largest
 * px size where the label fits on a single line.
 *
 * Recomputes on container resize via ResizeObserver.
 */
interface FitTextProps {
  text: string;
  /** Font shorthand template — `${size}px` is substituted in. e.g. `500 ${size}px / 1 "Cormorant Garamond", serif` */
  fontTemplate: string;
  /** Min/max px bounds for the search. */
  minSize?: number;
  maxSize?: number;
  /** Letter-spacing in px (matches CSS `letter-spacing`). */
  letterSpacing?: number;
  className?: string;
  style?: CSSProperties;
  as?: ElementType;
}

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function FitText({
  text,
  fontTemplate,
  minSize = 9,
  maxSize = 28,
  letterSpacing = 0,
  className,
  style,
  as: Tag = "span",
}: FitTextProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [size, setSize] = useState<number>(maxSize);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const width = el.clientWidth;
      if (width <= 0) return;

      // Binary search the largest px size where the text lays out on one line.
      let lo = minSize;
      let hi = maxSize;
      let best = minSize;
      // 6 iterations is enough for a tight fit across our range.
      for (let i = 0; i < 8; i++) {
        const mid = (lo + hi) / 2;
        const font = fontTemplate.replace("${size}", String(mid));
        const prepared = prepare(text, font, { letterSpacing });
        // line height doesn't matter for line count; use the size itself.
        const { lineCount } = layout(prepared, width, mid);
        if (lineCount <= 1) {
          best = mid;
          lo = mid;
        } else {
          hi = mid;
        }
        if (hi - lo < 0.25) break;
      }
      setSize(Math.floor(best * 100) / 100);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, fontTemplate, minSize, maxSize, letterSpacing]);

  return createElement(
    Tag,
    {
      ref,
      className,
      style: {
        ...style,
        fontSize: `${size}px`,
        lineHeight: 1,
        whiteSpace: "nowrap",
        display: "block",
      },
    },
    text,
  );
}

