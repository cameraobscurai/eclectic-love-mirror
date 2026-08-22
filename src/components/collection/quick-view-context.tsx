import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { CollectionProduct } from "@/lib/phase3-catalog";

/**
 * Quick View catalog registry.
 *
 * Quick View is the middle layer between a product grid and the PDP. It is
 * hosted ONCE at the root (see QuickViewHost) so every surface — the
 * collection grid, the wall layout, search results, the PDP's related rails —
 * gets the same modal without owning any of its state.
 *
 * A route "publishes" what it knows:
 *   - `catalog`  — every product the route has in memory (slug → product).
 *   - `sequence` — the ordered, currently-visible list, if the route has one.
 *                  The host's prev/next arrows walk this list; a route with
 *                  no meaningful ordering (a PDP) omits it and the arrows hide.
 */

interface QuickViewCatalogValue {
  catalog: CollectionProduct[];
  sequence: CollectionProduct[] | null;
  publish: (catalog: CollectionProduct[], sequence: CollectionProduct[] | null) => void;
}

const QuickViewCatalogContext = createContext<QuickViewCatalogValue>({
  catalog: [],
  sequence: null,
  publish: () => {},
});

export function QuickViewCatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<CollectionProduct[]>([]);
  const [sequence, setSequence] = useState<CollectionProduct[] | null>(null);

  // Stable identity — usePublishQuickViewCatalog depends on it, so an
  // unstable publish would re-fire the effect on every state commit.
  const publish = useCallback(
    (next: CollectionProduct[], nextSequence: CollectionProduct[] | null) => {
      setCatalog((prev) => (prev === next ? prev : next));
      setSequence((prev) => (prev === nextSequence ? prev : nextSequence));
    },
    [],
  );

  const value = useMemo<QuickViewCatalogValue>(
    () => ({ catalog, sequence, publish }),
    [catalog, sequence, publish],
  );

  return (
    <QuickViewCatalogContext.Provider value={value}>{children}</QuickViewCatalogContext.Provider>
  );
}

export function useQuickViewCatalog() {
  return useContext(QuickViewCatalogContext);
}

/**
 * Called by any route that renders products. Re-publishes whenever the list
 * identity changes, and clears on unmount so a stale catalog from a previous
 * route can never resolve a modal.
 */
export function usePublishQuickViewCatalog(
  catalog: CollectionProduct[],
  sequence?: CollectionProduct[] | null,
) {
  const { publish } = useQuickViewCatalog();
  const seq = sequence ?? null;
  useEffect(() => {
    publish(catalog, seq);
    return () => publish([], null);
  }, [catalog, seq, publish]);
}
