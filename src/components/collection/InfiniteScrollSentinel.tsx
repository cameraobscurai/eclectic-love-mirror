import { useEffect, useRef } from "react";

/**
 * Sentinel that fires `onReach` whenever it scrolls within ~1200px of the
 * viewport. Used at the bottom of the collection grid in place of the old
 * "Load more (N remaining)" button — gives the satisfying continuous reveal
 * users expect from modern image archives without ever showing a stop sign.
 *
 * Single shared IntersectionObserver, generous rootMargin so the next batch
 * is already streaming by the time the user sees the bottom of the current
 * one. Re-arms on every render so consecutive batches keep firing as the
 * sentinel re-enters the margin window.
 */
export function InfiniteScrollSentinel({ onReach }: { onReach: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  // Keep the latest callback in a ref so the observer never needs to be
  // re-created when the parent's closure changes.
  const cb = useRef(onReach);
  cb.current = onReach;

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      // SSR / very old browsers — fall back to immediate fire so the user
      // can still page through the catalog.
      cb.current();
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) cb.current();
        }
      },
      { rootMargin: "1200px 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="mt-8 h-12 w-full"
      data-infinite-sentinel=""
    />
  );
}
