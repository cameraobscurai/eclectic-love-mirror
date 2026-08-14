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
  const peek = useRouterState({
    select: (s) => ((s.location.search as { peek?: string }).peek ?? ""),
  });

  const open = useCallback(
    (slugOrId: string) => {
      const hit = catalog.find((p) => p.id === slugOrId || p.slug === slugOrId);
      const slug = hit?.slug ?? slugOrId;
      if (typeof window !== "undefined") {
        if (quickViewOpener.scrollY === null) {
          quickViewOpener.scrollY = window.scrollY;
          quickViewOpener.element = document.activeElement as HTMLElement | null;
        }
      }
      navigate({
        to: ".",
        search: ((prev: Record<string, unknown>) => ({ ...prev, peek: slug })) as never,
        // Opening pushes a history entry so back closes the modal.
        replace: false,
        resetScroll: false,
        mask: { to: "/collection/$slug", params: { slug }, search: {} } as never,
      });
    },
    [catalog, navigate],
  );

  const close = useCallback(() => {
    navigate({
      to: ".",
      search: ((prev: Record<string, unknown>) => {
        const next = { ...prev };
        delete next.peek;
        return next;
      }) as never,
      // Closing REPLACES the masked entry so open → close → back leaves the
      // page instead of reopening the modal.
      replace: true,
      resetScroll: false,
    });
  }, [navigate]);


  return { peek, open, close };
}
