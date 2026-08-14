import { Suspense, lazy, useEffect, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { acquireScrollLock } from "@/lib/scroll-lock";
import { useQuickView, quickViewOpener } from "@/hooks/use-quick-view";
import { useQuickViewCatalog } from "./quick-view-context";
import type { CollectionProduct } from "@/lib/phase3-catalog";

const QuickViewModal = lazy(() =>
  import("./QuickViewModal").then((m) => ({ default: m.QuickViewModal })),
);

/**
 * The single Quick View mount, hosted at the root.
 *
 * Reads the global `peek` param, resolves the product from whatever catalog
 * the current route published, and renders the modal. Prev/next walk the
 * route's published sequence when it has one (the filtered collection grid);
 * on surfaces without an ordering they're hidden.
 *
 * If the slug isn't in memory, nothing renders — the masked URL is the real
 * product page, so a reload lands on the PDP. Never a dead modal.
 */
export function QuickViewHost() {
  const { peek, open, close } = useQuickView();
  const { catalog, sequence } = useQuickViewCatalog();

  const list: CollectionProduct[] = sequence ?? [];

  const index = useMemo(() => {
    if (!peek) return -1;
    return list.findIndex((p) => p.id === peek || p.slug === peek);
  }, [list, peek]);

  const product: CollectionProduct | null = useMemo(() => {
    if (!peek) return null;
    if (index >= 0) return list[index] ?? null;
    return catalog.find((p) => p.id === peek || p.slug === peek) ?? null;
  }, [catalog, index, list, peek]);

  // Body lock + scroll restore + focus return, shared by every surface.
  useEffect(() => {
    if (!product) return undefined;
    const release = acquireScrollLock();
    return () => {
      release();
      const y = quickViewOpener.scrollY;
      quickViewOpener.scrollY = null;
      const opener = quickViewOpener.element;
      quickViewOpener.element = null;
      if (y !== null) {
        requestAnimationFrame(() => {
          window.scrollTo({ top: y, behavior: "auto" });
          if (opener && document.contains(opener)) {
            opener.focus({ preventScroll: true });
          }
        });
      }
    };
  }, [product]);

  return (
    <Suspense fallback={null}>
      <AnimatePresence>
        {product && (
          <QuickViewModal
            key={product.id}
            product={product}
            hasPrev={index > 0}
            hasNext={index >= 0 && index < list.length - 1}
            onPrev={() => {
              const prev = list[index - 1];
              if (prev) open(prev.slug ?? prev.id);
            }}
            onNext={() => {
              const next = list[index + 1];
              if (next) open(next.slug ?? next.id);
            }}
            onClose={close}
          />
        )}
      </AnimatePresence>
    </Suspense>
  );
}
