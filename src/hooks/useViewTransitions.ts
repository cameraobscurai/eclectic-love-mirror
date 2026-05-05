import { useEffect } from "react";

// ---------------------------------------------------------------------------
// useViewTransitions
//
// Intercepts in-app anchor clicks and wraps the resulting navigation in
// document.startViewTransition so the browser does a native crossfade
// morph between routes. Pairs with view-transition CSS in styles.css.
//
// Implementation note: TanStack Router doesn't expose a hook into its
// commit phase, so we hijack the click event before it reaches the router,
// start a view transition, and re-dispatch a programmatic click inside
// the transition callback. The router then handles it normally and the
// DOM swap happens inside the snapshot window.
//
// Browsers without startViewTransition (Firefox today) fall through to the
// default click — zero polyfill, no behavioural change.
// ---------------------------------------------------------------------------

type ViewTransitionDoc = Document & {
  startViewTransition?: (cb: () => void | Promise<void>) => {
    finished: Promise<void>;
  };
};

export function useViewTransitions() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const doc = document as ViewTransitionDoc;
    if (typeof doc.startViewTransition !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onClick = (e: MouseEvent) => {
      // Ignore modified clicks (cmd-click, middle-click, etc.)
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      // Only same-origin nav.
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        // Same URL — let default scroll handling kick in.
        if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      } catch {
        return;
      }
      // External target (new tab/window) bypasses the transition.
      if (a.target && a.target !== "" && a.target !== "_self") return;

      e.preventDefault();
      doc.startViewTransition!(async () => {
        // Re-dispatch the click inside the transition snapshot. TanStack
        // Router's click handler picks it up and commits the navigation.
        const replay = new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          view: window,
          button: 0,
        });
        a.dispatchEvent(replay);
        // Give the router a frame to commit the new route subtree.
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
      });
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
}
