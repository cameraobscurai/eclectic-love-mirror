// Tiny shim for the View Transitions API.
// Falls back to running the callback immediately on browsers without
// support (Firefox, older Safari) — no regression, just no morph.

type StartViewTransition = (cb: () => void) => { finished: Promise<void> };

const VT_NAME = "gallery-hero";

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/**
 * Run `update` inside a View Transition, marking `sourceEl` and
 * `getDestEl()` (resolved after the DOM update) with the same
 * view-transition-name so the browser morphs them.
 *
 * Safe everywhere: if startViewTransition or sourceEl is missing, the
 * update simply runs synchronously.
 */
export function morphOpen(
  sourceEl: HTMLElement | null,
  update: () => void,
  getDestEl: () => HTMLElement | null,
) {
  const doc = typeof document !== "undefined" ? (document as Document & { startViewTransition?: StartViewTransition }) : null;
  const start = doc?.startViewTransition?.bind(doc);

  if (!start || !sourceEl || prefersReducedMotion()) {
    update();
    return;
  }

  // Tag source.
  const prevSource = sourceEl.style.viewTransitionName;
  sourceEl.style.viewTransitionName = VT_NAME;

  const transition = start(() => {
    update();
    // Tag destination synchronously inside the snapshot phase so the
    // browser captures it as the matching pair.
    const dest = getDestEl();
    if (dest) dest.style.viewTransitionName = VT_NAME;
  });

  transition.finished.finally(() => {
    sourceEl.style.viewTransitionName = prevSource;
    const dest = getDestEl();
    if (dest) dest.style.viewTransitionName = "";
  });
}
