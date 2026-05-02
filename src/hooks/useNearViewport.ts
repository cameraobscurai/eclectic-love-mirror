import { useEffect, useRef, useState } from "react";

/**
 * Returns `true` once the element ref is within `rootMargin` of the viewport.
 * Once true, stays true for the session (stable mount → no rerender churn
 * while scrolling). Safe for SSR — defaults to `initial`.
 *
 * Used by the collection grid to gate expensive card internals (image
 * requests, hover overlays) for cards beyond the eager window.
 */
export function useNearViewport<T extends Element = HTMLElement>(
  options?: { rootMargin?: string; threshold?: number; initial?: boolean },
): { ref: React.RefObject<T | null>; near: boolean } {
  const { rootMargin = "600px", threshold = 0, initial = false } = options ?? {};
  const ref = useRef<T | null>(null);
  const [near, setNear] = useState<boolean>(initial);

  useEffect(() => {
    if (initial) return;
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
      // SSR / very old browsers: render eagerly rather than hide content.
      setNear(true);
      return;
    }
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setNear(true);
            io.disconnect();
            return;
          }
        }
      },
      { rootMargin, threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin, threshold, initial]);

  return { ref, near };
}
