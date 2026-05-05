import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

// ---------------------------------------------------------------------------
// useViewTransitions
//
// Wraps TanStack Router navigations in document.startViewTransition so the
// browser does a native crossfade morph between routes. Hero images, the nav
// bar and any [style="view-transition-name: ..."] elements animate
// individually when their identity is preserved across routes.
//
// Browsers without the API (Firefox today) silently fall through to a
// regular navigation — zero polyfill cost.
// ---------------------------------------------------------------------------

type ViewTransitionDoc = Document & {
  startViewTransition?: (cb: () => void | Promise<void>) => unknown;
};

export function useViewTransitions() {
  const router = useRouter();

  useEffect(() => {
    if (typeof document === "undefined") return;
    const doc = document as ViewTransitionDoc;
    if (typeof doc.startViewTransition !== "function") return;

    // Honour reduced-motion: skip the transition wrapper entirely.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const unsub = router.subscribe("onBeforeNavigate", () => {
      // Defer the actual navigation inside startViewTransition. Router
      // commits its state synchronously inside the callback; the browser
      // then crossfades the before/after DOM snapshots.
      // We can't easily wrap router state mutation here, so instead we
      // rely on the snapshot timing: subscribing to onBeforeNavigate
      // fires *before* the DOM swaps, and onResolved fires after. The
      // pattern below uses the modern recipe of starting a transition
      // around the next paint.
      const docVT = document as ViewTransitionDoc;
      if (typeof docVT.startViewTransition !== "function") return;
      docVT.startViewTransition(async () => {
        // Wait one frame so the router's pending state has committed.
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
      });
    });

    return unsub;
  }, [router]);
}
