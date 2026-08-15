import { useCallback } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuickViewCatalog } from "@/components/collection/quick-view-context";

/**
 * The one way to open Quick View, from anywhere.
 *
 * Transport: a global `peek=<slug>` search param registered on the root
 * route, so the current route (its filters, sort, layout, scroll) is fully
 * preserved — no navigation away from the page.
 *
 * Display: the navigation is MASKED to the real product URL
 * (`/collection/<slug>`), so copying the address bar shares something
 * meaningful. Masks are client-side only: reloading that URL resolves the
 * real PDP route with its own SSR metadata. No modal-only URL escapes.
 */

// Module-scope so the host (a sibling component) can read them without prop
// drilling through every surface that opens the modal.
export const quickViewOpener = {
  scrollY: null as number | null,
  element: null as HTMLElement | null,
};

export function useQuickView() {
  const navigate = useNavigate();
  const { catalog } = useQuickViewCatalog();
  // The router's `location` is the REAL (unmasked) location — the mask only
  // affects the address bar. Pin every peek navigation to this pathname and
  // search instead of `to: "."`, which resolves relative to the masked route
  // while the modal is open and can drop filters mid-sequence.
  const { pathname, search, peek } = useRouterState({
    select: (s) => ({
      pathname: s.location.pathname,
      search: s.location.search as Record<string, unknown>,
      peek: ((s.location.search as { peek?: string }).peek ?? ""),
    }),
  });

  const open = useCallback(
    (slugOrId: string, options?: { replace?: boolean }) => {
      const hit = catalog.find((p) => p.id === slugOrId || p.slug === slugOrId);
      const slug = hit?.slug ?? slugOrId;
      if (typeof window !== "undefined") {
        // Captured on the OPENING click only. `peek` is truthy while the
        // modal is already up, so prev/next never re-record (they'd store the
        // locked-body scroll, i.e. 0). A stale value from a previous session
        // is overwritten here rather than trusted.
        if (!peek) {
          quickViewOpener.scrollY = window.scrollY;
          quickViewOpener.element = document.activeElement as HTMLElement | null;
        }
      }

      navigate({
        to: pathname,
        search: { ...search, peek: slug } as never,
        // Opening pushes a history entry so back closes the modal.
        // Prev/next REPLACE, so one back press closes after any number of steps.
        replace: options?.replace ?? false,
        resetScroll: false,
        mask: { to: "/collection/$slug", params: { slug }, search: {} } as never,
      });
    },
    [catalog, navigate, pathname, search],
  );

  const close = useCallback(() => {
    const next = { ...search };
    delete next.peek;
    navigate({
      to: pathname,
      search: next as never,
      // Closing REPLACES the masked entry so open → close → back leaves the
      // page instead of reopening the modal.
      replace: true,
      resetScroll: false,
    });
  }, [navigate, pathname, search]);



  return { peek, open, close };
}
