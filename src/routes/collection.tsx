import { createFileRoute, useNavigate, ErrorComponent } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { LayoutGroup, AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  getCollectionCatalog,
  CATEGORY_DISPLAY_ORDER,
  type CollectionProduct,
  type CategoryFacet,
  type CatalogPayload,
} from "@/lib/phase3-catalog";
import { CategoryPill } from "@/components/collection/CategoryPill";
import { ProductTile } from "@/components/collection/ProductTile";
import { QuickViewModal } from "@/components/collection/QuickViewModal";
import { InquiryTray } from "@/components/collection/InquiryTray";
import { CategoryOverview } from "@/components/collection/CategoryOverview";

const INITIAL_BATCH = 48;
const BATCH_INCREMENT = 48;

const SORTS = ["type", "az", "newest", "oldest"] as const;
type SortKey = (typeof SORTS)[number];

interface CollectionSearch {
  category: string;
  sub: string;
  q: string;
  sort: SortKey;
  view: string;
}

const searchSchema = z.object({
  category: fallback(z.string(), "").default(""),
  sub: fallback(z.string(), "").default(""),
  q: fallback(z.string(), "").default(""),
  sort: fallback(z.enum(SORTS), "type").default("type"),
  view: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/collection")({
  head: () => ({
    meta: [
      { title: "Hive Signature Collection — Inventory | Eclectic Hive" },
      {
        name: "description",
        content:
          "Browse the Hive Signature Collection: a curated rental inventory of furniture, lighting, tableware, and bespoke pieces for events.",
      },
      { property: "og:title", content: "Hive Signature Collection — Eclectic Hive" },
      {
        property: "og:description",
        content:
          "Signature rental inventory of luxury event furniture, lighting, tableware, and decor.",
      },
    ],
  }),
  validateSearch: zodValidator(searchSchema),
  loader: async (): Promise<CatalogPayload> => getCollectionCatalog(),
  errorComponent: ({ error }) => <ErrorComponent error={error} />,
  notFoundComponent: () => <div className="p-12">Not found</div>,
  component: CollectionPage,
});

function CollectionPage() {
  const data = Route.useLoaderData() as CatalogPayload;
  const { products, facets, total } = data;
  const search = Route.useSearch() as CollectionSearch;
  const { category, sub, q, sort, view } = search;
  const navigate = useNavigate({ from: "/collection" });
  const reduced = useReducedMotion();

  // Overview mode: category=all (i.e. no category) AND no active search query.
  const isOverviewMode = !category && !q.trim();

  // Debounced search input
  const [qLocal, setQLocal] = useState(q);
  useEffect(() => setQLocal(q), [q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (qLocal !== q) {
        navigate({
          search: (prev: CollectionSearch) => ({ ...prev, q: qLocal, sub: "" }),
          replace: true,
        });
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qLocal]);

  // ====== LAYERED FILTER PIPELINE ======
  // Each layer recomputes only when its own inputs change.

  // 1. Search-filtered (most expensive when q is short → still cheap)
  const searchFiltered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return products;
    return products.filter((p: CollectionProduct) =>
      p.title.toLowerCase().includes(query),
    );
  }, [products, q]);

  // 2. Category-filtered
  const categoryFiltered = useMemo(() => {
    if (!category) return searchFiltered;
    return searchFiltered.filter((p) => p.categorySlug === category);
  }, [searchFiltered, category]);

  // 3. Subcategory-filtered
  const subcategoryFiltered = useMemo(() => {
    if (!sub) return categoryFiltered;
    return categoryFiltered.filter((p) => p.subcategory === sub);
  }, [categoryFiltered, sub]);

  // 4. Sorted (final list)
  const filtered = useMemo(() => {
    const list = [...subcategoryFiltered];
    const query = q.trim().toLowerCase();

    if (query) {
      const rank = (p: CollectionProduct) => {
        const t = p.title.toLowerCase();
        if (t === query) return 0;
        if (t.startsWith(query)) return 1;
        return 2;
      };
      list.sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title));
      return list;
    }

    switch (sort) {
      case "az":
        list.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "newest":
        list.sort((a, b) => a.scrapedOrder - b.scrapedOrder);
        break;
      case "oldest":
        list.sort((a, b) => b.scrapedOrder - a.scrapedOrder);
        break;
      case "type":
      default: {
        const orderIdx = new Map<string, number>(
          CATEGORY_DISPLAY_ORDER.map((d, i) => [d, i] as const),
        );
        list.sort(
          (a, b) =>
            (orderIdx.get(a.displayCategory) ?? 999) -
              (orderIdx.get(b.displayCategory) ?? 999) ||
            a.title.localeCompare(b.title),
        );
      }
    }
    return list;
  }, [subcategoryFiltered, sort, q]);

  // Failed-image filter: per-session set of product ids whose primary image
  // 404'd in-browser. They get hidden from the visible grid so we never show
  // a broken-image icon. Data-layer count stays at 876.
  const [failedIds, setFailedIds] = useState<Set<string>>(() => new Set());
  const markFailed = (id: string) =>
    setFailedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  const visibleProducts = useMemo(
    () =>
      failedIds.size === 0
        ? filtered
        : filtered.filter((p: CollectionProduct) => !failedIds.has(p.id)),
    [filtered, failedIds],
  );

  // Subcategory facets — derived from category-filtered list (Local Love pattern)
  const subcategoryFacets = useMemo(() => {
    if (!category) return [] as { label: string; count: number }[];
    const m = new Map<string, number>();
    for (const p of categoryFiltered) {
      if (!p.subcategory) continue;
      m.set(p.subcategory, (m.get(p.subcategory) ?? 0) + 1);
    }
    return [...m.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [categoryFiltered, category]);

  // Group public-ready products by category for overview mode preview bands.
  // Sorted by `scrapedOrder` (newest first) so overview shows fresh hero pieces.
  const productsByCategory = useMemo(() => {
    if (!isOverviewMode) return {} as Record<string, CollectionProduct[]>;
    const map: Record<string, CollectionProduct[]> = {};
    for (const p of products) {
      (map[p.categorySlug] ??= []).push(p);
    }
    for (const slug of Object.keys(map)) {
      map[slug].sort((a, b) => a.scrapedOrder - b.scrapedOrder);
    }
    return map;
  }, [products, isOverviewMode]);

  // Load More — only applies to grid mode. Reset whenever the filter shape
  // changes so a new selection always starts from the first batch.
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);
  useEffect(() => {
    setVisibleCount(INITIAL_BATCH);
  }, [category, sub, q, sort]);
  const visibleBatch = useMemo(
    () => visibleProducts.slice(0, visibleCount),
    [visibleProducts, visibleCount],
  );
  const hasMore = visibleProducts.length > visibleCount;

  // Quick view — URL-driven via ?view=<id|slug>. Back button closes it,
  // direct links open the object, missing/non-public ids are ignored.
  const setQuickViewId = (id: string | null) => {
    navigate({
      search: (prev: CollectionSearch) => ({ ...prev, view: id ?? "" }),
      replace: false,
    });
  };
  const quickViewIndex = useMemo(() => {
    if (!view) return -1;
    return visibleProducts.findIndex(
      (p: CollectionProduct) => p.id === view || p.slug === view,
    );
  }, [visibleProducts, view]);
  const quickViewProduct: CollectionProduct | null =
    quickViewIndex >= 0 ? visibleProducts[quickViewIndex] : null;

  // Body scroll lock when Quick View open
  useEffect(() => {
    if (!quickViewProduct) return undefined;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.removeProperty("overflow");
    };
  }, [quickViewProduct]);

  const hasActiveFilters = !!(category || sub || q);
  const resetAll = () => {
    setQLocal("");
    navigate({
      search: () => ({ category: "", sub: "", q: "", sort: "type" as SortKey, view: "" }),
      replace: true,
    });
  };

  return (
    <main className="min-h-screen bg-white text-charcoal pb-32">
      {/* Hero */}
      <section className="pt-32 pb-12 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/50">
            Hive Signature Collection
          </p>
          <h1 className="mt-4 font-display text-[clamp(2.5rem,6vw,5rem)] leading-[1] tracking-tight">
            The Collection
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-charcoal/70">
            A working rental inventory of furniture, lighting, tableware, and bespoke pieces.
            Browse by category, search by name, then add favorites to an inquiry.
          </p>
        </div>
      </section>

      {/* Sticky filter header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-y border-charcoal/10">
        {/* Primary category row with shared layoutId underline */}
        <div className="px-6 lg:px-12 border-b border-charcoal/10">
          <LayoutGroup id="collection-primary-pills">
            <div className="max-w-7xl mx-auto flex gap-1 overflow-x-auto py-2 no-scrollbar snap-x">
              <CategoryPill
                label={`All (${total})`}
                active={!category}
                layoutGroupId="collection-pill-active-primary"
                onClick={() =>
                  navigate({
                    search: (prev: CollectionSearch) => ({
                      ...prev,
                      category: "",
                      sub: "",
                    }),
                    replace: true,
                  })
                }
              />
              {facets.map((f: CategoryFacet) => (
                <CategoryPill
                  key={f.slug}
                  label={`${f.display} (${f.count})`}
                  active={category === f.slug}
                  layoutGroupId="collection-pill-active-primary"
                  onClick={() =>
                    navigate({
                      search: (prev: CollectionSearch) => ({
                        ...prev,
                        category: f.slug,
                        sub: "",
                      }),
                      replace: true,
                    })
                  }
                />
              ))}
            </div>
          </LayoutGroup>
        </div>

        {/* Sub row + search/sort — sub pills hidden in overview mode */}
        <div className="px-6 lg:px-12">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 py-3">
            <AnimatePresence mode="wait">
              {!isOverviewMode && subcategoryFacets.length > 0 ? (
                <motion.div
                  key={`sub-${category}`}
                  initial={
                    reduced ? { opacity: 1 } : { opacity: 0, y: -4 }
                  }
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
                  transition={{ duration: reduced ? 0 : 0.2 }}
                  className="flex-1 min-w-0"
                >
                  <LayoutGroup id={`collection-sub-pills-${category}`}>
                    <div className="flex gap-1 overflow-x-auto no-scrollbar snap-x">
                      <CategoryPill
                        label="All"
                        active={!sub}
                        variant="sub"
                        layoutGroupId={`collection-pill-active-sub-${category}`}
                        onClick={() =>
                          navigate({
                            search: (prev: CollectionSearch) => ({
                              ...prev,
                              sub: "",
                            }),
                            replace: true,
                          })
                        }
                      />
                      {subcategoryFacets.map((s) => (
                        <CategoryPill
                          key={s.label}
                          label={`${s.label} (${s.count})`}
                          active={sub === s.label}
                          variant="sub"
                          layoutGroupId={`collection-pill-active-sub-${category}`}
                          onClick={() =>
                            navigate({
                              search: (prev: CollectionSearch) => ({
                                ...prev,
                                sub: s.label,
                              }),
                              replace: true,
                            })
                          }
                        />
                      ))}
                    </div>
                  </LayoutGroup>
                </motion.div>
              ) : (
                <div className="flex-1" />
              )}
            </AnimatePresence>

            <div className="flex items-center gap-3 flex-shrink-0">
              <input
                type="text"
                inputMode="search"
                placeholder="Search pieces…"
                value={qLocal}
                onChange={(e) => setQLocal(e.target.value)}
                className="h-9 w-full lg:w-56 bg-transparent border border-charcoal/15 px-3 text-sm placeholder:text-charcoal/40 focus:outline-none focus:border-charcoal/50 transition-colors"
              />
              <select
                value={sort}
                onChange={(e) =>
                  navigate({
                    search: (prev: CollectionSearch) => ({
                      ...prev,
                      sort: e.target.value as SortKey,
                    }),
                    replace: true,
                  })
                }
                className="h-9 bg-transparent border border-charcoal/15 px-2 text-sm text-charcoal focus:outline-none focus:border-charcoal/50 transition-colors"
              >
                <option value="type">By Type</option>
                <option value="az">A–Z</option>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>
          </div>
        </div>

        {/* Result count */}
        <div className="px-6 lg:px-12 border-t border-charcoal/10">
          <div className="max-w-7xl mx-auto flex items-center justify-between py-2.5">
            <motion.p
              key={`${visibleProducts.length}-${visibleBatch.length}-${isOverviewMode}`}
              initial={reduced ? { opacity: 1 } : { opacity: 0.4 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reduced ? 0 : 0.25 }}
              className="text-xs uppercase tracking-[0.2em] text-charcoal/60"
            >
              {isOverviewMode
                ? `${total} pieces · browse by category`
                : q.trim()
                  ? `${visibleProducts.length} ${visibleProducts.length === 1 ? "piece" : "pieces"} matching “${q.trim()}”`
                  : hasMore
                    ? `Showing ${visibleBatch.length} of ${visibleProducts.length} pieces`
                    : `${visibleProducts.length} ${visibleProducts.length === 1 ? "piece" : "pieces"}`}
            </motion.p>
            {hasActiveFilters && (
              <button
                onClick={resetAll}
                className="text-xs uppercase tracking-[0.2em] text-charcoal/60 hover:text-charcoal transition-colors active:scale-95"
              >
                Reset all
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body — overview mode OR animated grid mode */}
      <section className="px-6 lg:px-12 pt-8">
        <div className="max-w-7xl mx-auto">
          {isOverviewMode ? (
            <CategoryOverview
              facets={facets}
              productsByCategory={productsByCategory}
              onSelectCategory={(slug) =>
                navigate({
                  search: (prev: CollectionSearch) => ({
                    ...prev,
                    category: slug,
                    sub: "",
                  }),
                  replace: false,
                })
              }
              onOpenProduct={(id) => setQuickViewId(id)}
              onImageFailed={markFailed}
            />
          ) : visibleProducts.length === 0 ? (
            <div className="py-32 text-center">
              <p className="font-display text-3xl">No pieces found</p>
              <p className="mt-3 text-charcoal/60">Try adjusting your filters.</p>
              <button
                onClick={resetAll}
                className="mt-6 text-xs uppercase tracking-[0.2em] underline underline-offset-4 hover:text-charcoal/70 transition-colors"
              >
                Reset all filters
              </button>
            </div>
          ) : (
            <>
              <LayoutGroup id="collection-grid">
                <motion.ul
                  layout
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 lg:gap-4"
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 260, damping: 32, mass: 0.8 }
                  }
                >
                  <AnimatePresence mode="popLayout" initial={false}>
                    {visibleBatch.map((p: CollectionProduct, i: number) => (
                      <ProductTile
                        key={p.id}
                        product={p}
                        index={i}
                        onOpen={() => setQuickViewId(p.id)}
                        onImageFailed={markFailed}
                      />
                    ))}
                  </AnimatePresence>
                </motion.ul>
              </LayoutGroup>

              {hasMore && (
                <div className="mt-12 flex justify-center">
                  <button
                    onClick={() =>
                      setVisibleCount((c) =>
                        Math.min(c + BATCH_INCREMENT, visibleProducts.length),
                      )
                    }
                    className="px-8 py-3 border border-charcoal/30 text-xs uppercase tracking-[0.2em] text-charcoal hover:bg-charcoal hover:text-white transition-colors active:scale-[0.98]"
                  >
                    Load more ({visibleProducts.length - visibleBatch.length} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <AnimatePresence>
        {quickViewProduct && (
          <QuickViewModal
            key={quickViewProduct.id}
            product={quickViewProduct}
            hasPrev={quickViewIndex > 0}
            hasNext={quickViewIndex < visibleProducts.length - 1}
            onPrev={() => setQuickViewId(visibleProducts[quickViewIndex - 1]?.id ?? null)}
            onNext={() => setQuickViewId(visibleProducts[quickViewIndex + 1]?.id ?? null)}
            onClose={() => setQuickViewId(null)}
          />
        )}
      </AnimatePresence>

      <InquiryTray />
    </main>
  );
}
