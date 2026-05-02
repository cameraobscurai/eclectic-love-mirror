import { createFileRoute, useNavigate, ErrorComponent } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { LayoutGroup, AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  getCollectionCatalog,
  type CollectionProduct,
  type CatalogPayload,
} from "@/lib/phase3-catalog";
import {
  BROWSE_GROUP_LABELS,
  BROWSE_GROUP_ORDER,
  type BrowseGroupId,
  getBrowseGroupOptions,
  getProductBrowseGroup,
  groupProductsByBrowseGroup,
} from "@/lib/collection-browse-groups";
import {
  getProductSubcategory,
  getSubcategoryOptions,
} from "@/lib/collection-subcategories";
import { ProductTile } from "@/components/collection/ProductTile";
import { QuickViewModal } from "@/components/collection/QuickViewModal";
import { InquiryTray } from "@/components/collection/InquiryTray";

const INITIAL_BATCH = 48;
const BATCH_INCREMENT = 48;

const SORTS = ["type", "az", "newest", "oldest"] as const;
type SortKey = (typeof SORTS)[number];

interface CollectionSearch {
  group: string;
  sub: string;
  q: string;
  sort: SortKey;
  view: string;
}

const searchSchema = z.object({
  // Owner-priority browse group id (e.g. "sofas"). Empty = overview.
  group: fallback(z.string(), "").default(""),
  sub: fallback(z.string(), "").default(""),
  q: fallback(z.string(), "").default(""),
  sort: fallback(z.enum(SORTS), "type").default("type"),
  view: fallback(z.string(), "").default(""),
});

const BROWSE_GROUP_SET = new Set<string>(BROWSE_GROUP_ORDER);

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
  const { products, total } = data;
  const search = Route.useSearch() as CollectionSearch;
  const { group, sub, q, sort, view } = search;
  const navigate = useNavigate({ from: "/collection" });
  const reduced = useReducedMotion();

  // Validate group against the owner taxonomy. Unknown values fall back to
  // overview — the URL stays as-is but the UI ignores it.
  const activeGroup: BrowseGroupId | "" =
    group && BROWSE_GROUP_SET.has(group) ? (group as BrowseGroupId) : "";
  const isOverviewMode = !activeGroup && !q.trim();

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

  // 1. Search-filtered
  const searchFiltered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return products;
    return products.filter((p) => p.title.toLowerCase().includes(query));
  }, [products, q]);

  // 2. Browse-group filtered (owner taxonomy)
  const groupFiltered = useMemo(() => {
    if (!activeGroup) return searchFiltered;
    return searchFiltered.filter((p) => getProductBrowseGroup(p) === activeGroup);
  }, [searchFiltered, activeGroup]);

  // 3. Sub-pill filtered (derived display-only subcategories)
  const subFiltered = useMemo(() => {
    if (!sub || sub === "all") return groupFiltered;
    return groupFiltered.filter((p) => getProductSubcategory(p) === sub);
  }, [groupFiltered, sub]);

  // 4. Sorted
  const filtered = useMemo(() => {
    const list = [...subFiltered];
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
        // Owner priority order, then A–Z within group.
        const orderIdx = new Map<string, number>(
          BROWSE_GROUP_ORDER.map((id, i) => [id, i] as const),
        );
        list.sort((a, b) => {
          const ga = getProductBrowseGroup(a) ?? "";
          const gb = getProductBrowseGroup(b) ?? "";
          return (
            (orderIdx.get(ga) ?? 999) - (orderIdx.get(gb) ?? 999) ||
            a.title.localeCompare(b.title)
          );
        });
      }
    }
    return list;
  }, [subFiltered, sort, q]);

  // Failed-image filter (per-session)
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
        : filtered.filter((p) => !failedIds.has(p.id)),
    [filtered, failedIds],
  );

  // Owner-priority browse-group options (computed from the search-filtered set
  // so a typed query narrows the visible browse line too).
  const browseGroupOptions = useMemo(
    () => getBrowseGroupOptions(searchFiltered),
    [searchFiltered],
  );

  // Derived sub-pills from the group-filtered list. Only useful refinements
  // surface — fewer than 3 options (incl. "All") = hide the row.
  const subOptions = useMemo(() => {
    if (!activeGroup) return [];
    // The derived subcategory taxonomy is keyed off the raw catalog
    // categorySlug. Pass the group-filtered products and let the helper
    // bucket what makes sense per slug; if multiple slugs flow into a single
    // browse group, the helper still groups by keywords.
    const opts = getSubcategoryOptions(activeGroup, groupFiltered);
    return opts.length > 2 ? opts : [];
  }, [activeGroup, groupFiltered]);

  // Self-heal: if active sub disappears, drop it.
  useEffect(() => {
    if (!sub || sub === "all") return;
    const stillValid = subOptions.some((o) => o.id === sub);
    if (!stillValid) {
      navigate({
        search: (prev: CollectionSearch) => ({ ...prev, sub: "" }),
        replace: true,
      });
    }
  }, [sub, subOptions, navigate]);

  // Overview bands — owner priority order, public-ready products only.
  const overviewBuckets = useMemo(() => {
    if (!isOverviewMode) return new Map<BrowseGroupId, CollectionProduct[]>();
    return groupProductsByBrowseGroup(products);
  }, [products, isOverviewMode]);

  // Load More
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);
  useEffect(() => {
    setVisibleCount(INITIAL_BATCH);
  }, [activeGroup, sub, q, sort]);
  const visibleBatch = useMemo(
    () => visibleProducts.slice(0, visibleCount),
    [visibleProducts, visibleCount],
  );
  const hasMore = visibleProducts.length > visibleCount;

  // Quick View — URL-driven
  const setQuickViewId = (id: string | null) => {
    navigate({
      search: (prev: CollectionSearch) => ({ ...prev, view: id ?? "" }),
      replace: false,
    });
  };
  const quickViewIndex = useMemo(() => {
    if (!view) return -1;
    return visibleProducts.findIndex((p) => p.id === view || p.slug === view);
  }, [visibleProducts, view]);
  const quickViewProduct: CollectionProduct | null =
    quickViewIndex >= 0 ? visibleProducts[quickViewIndex] : null;

  useEffect(() => {
    if (!quickViewProduct) return undefined;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.removeProperty("overflow");
    };
  }, [quickViewProduct]);

  const hasActiveFilters = !!(activeGroup || sub || q);
  const resetAll = () => {
    setQLocal("");
    navigate({
      search: () => ({
        group: "",
        sub: "",
        q: "",
        sort: "type" as SortKey,
        view: "",
      }),
      replace: true,
    });
  };

  const selectGroup = (id: BrowseGroupId | "") => {
    navigate({
      search: (prev: CollectionSearch) => ({ ...prev, group: id, sub: "" }),
      replace: true,
    });
  };

  // ---- Result meta line text ----
  const groupLabel = activeGroup ? BROWSE_GROUP_LABELS[activeGroup] : null;
  const trimmedQ = q.trim();
  let resultMeta: string;
  if (isOverviewMode) {
    resultMeta = `${total} pieces · browse by category`;
  } else if (trimmedQ && !activeGroup) {
    resultMeta = `${visibleProducts.length} ${visibleProducts.length === 1 ? "piece" : "pieces"} matching “${trimmedQ}”`;
  } else if (groupLabel && hasMore) {
    resultMeta = `${groupLabel} · showing ${visibleBatch.length} of ${visibleProducts.length}`;
  } else if (groupLabel) {
    resultMeta = `${groupLabel} · ${visibleProducts.length} ${visibleProducts.length === 1 ? "piece" : "pieces"}`;
  } else if (hasMore) {
    resultMeta = `Showing ${visibleBatch.length} of ${visibleProducts.length} pieces`;
  } else {
    resultMeta = `${visibleProducts.length} ${visibleProducts.length === 1 ? "piece" : "pieces"}`;
  }

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

      {/* Sticky browse + control header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-y border-charcoal/10">
        {/* Owner-priority browse line — single primary navigation */}
        <div className="px-6 lg:px-12 border-b border-charcoal/10">
          <div className="max-w-7xl mx-auto">
            <LayoutGroup id="collection-browse-line">
              <div className="relative">
                <div
                  aria-hidden
                  className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10"
                />
                <div className="flex items-end gap-1 overflow-x-auto py-2 no-scrollbar snap-x scroll-px-8">
                  <BrowsePill
                    label="Overview"
                    active={!activeGroup}
                    onClick={() => selectGroup("")}
                    reduced={reduced}
                  />
                  {browseGroupOptions.map((opt) => (
                    <BrowsePill
                      key={opt.id}
                      label={opt.label}
                      count={opt.count}
                      active={activeGroup === opt.id}
                      onClick={() => selectGroup(opt.id)}
                      reduced={reduced}
                    />
                  ))}
                </div>
              </div>
            </LayoutGroup>
          </div>
        </div>

        {/* Single control row: result meta · sub-pills (if useful) · search · sort · clear */}
        <div className="px-6 lg:px-12">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center gap-3 py-3">
            <motion.p
              key={`${visibleProducts.length}-${visibleBatch.length}-${isOverviewMode}-${activeGroup}`}
              initial={reduced ? { opacity: 1 } : { opacity: 0.4 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reduced ? 0 : 0.25 }}
              className="text-[11px] uppercase tracking-[0.2em] text-charcoal/60 lg:flex-shrink-0"
            >
              {resultMeta}
            </motion.p>

            {/* Sub-pills — only when meaningfully refining (>2 options) */}
            <AnimatePresence mode="wait">
              {!isOverviewMode && subOptions.length > 0 ? (
                <motion.div
                  key={`sub-${activeGroup}`}
                  initial={reduced ? { opacity: 1 } : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
                  transition={{ duration: reduced ? 0 : 0.2 }}
                  className="flex-1 min-w-0"
                >
                  <LayoutGroup id={`sub-pills-${activeGroup}`}>
                    <div className="flex gap-1 overflow-x-auto no-scrollbar snap-x">
                      {subOptions.map((s) => {
                        const isAll = s.id === "all";
                        const active = isAll
                          ? !sub || sub === "all"
                          : sub === s.id;
                        return (
                          <BrowsePill
                            key={s.id}
                            label={isAll ? "All" : s.label}
                            count={isAll ? undefined : s.count}
                            active={active}
                            variant="sub"
                            onClick={() =>
                              navigate({
                                search: (prev: CollectionSearch) => ({
                                  ...prev,
                                  sub: isAll ? "" : s.id,
                                }),
                                replace: true,
                              })
                            }
                            reduced={reduced}
                          />
                        );
                      })}
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
                className="h-9 w-full lg:w-56 bg-transparent border-b border-charcoal/20 px-1 text-sm placeholder:text-charcoal/40 focus:outline-none focus:border-charcoal transition-colors"
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
                className="h-9 bg-transparent border-b border-charcoal/20 px-1 text-sm text-charcoal focus:outline-none focus:border-charcoal transition-colors"
              >
                <option value="type">By Type</option>
                <option value="az">A–Z</option>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
              {hasActiveFilters && (
                <button
                  onClick={resetAll}
                  className="text-[11px] uppercase tracking-[0.2em] text-charcoal/60 hover:text-charcoal transition-colors active:scale-95"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body — full width, no side rail */}
      <section className="px-6 lg:px-12 pt-10">
        <div className="max-w-7xl mx-auto">
          {isOverviewMode ? (
            <OverviewBands
              buckets={overviewBuckets}
              onSelectGroup={(id) => selectGroup(id)}
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
                Clear filters
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
                    {visibleBatch.map((p, i) => (
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

// ---------- Inline subcomponents ----------

interface BrowsePillProps {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
  variant?: "primary" | "sub";
  reduced: boolean | null;
}

/**
 * Underline-only pill — no boxes, no borders, no filled chrome.
 * Active state animates a thin charcoal underline via shared layoutId.
 */
function BrowsePill({
  label,
  count,
  active,
  onClick,
  variant = "primary",
  reduced,
}: BrowsePillProps) {
  const isSub = variant === "sub";
  const layoutId = isSub ? "sub-active" : "browse-active";
  return (
    <button
      onClick={onClick}
      className={[
        "relative whitespace-nowrap uppercase shrink-0 snap-start transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        isSub
          ? "text-[10px] tracking-[0.18em] px-2 py-1.5 pb-2"
          : "text-[11px] tracking-[0.22em] px-3 py-2.5 pb-3",
        active ? "text-charcoal" : "text-charcoal/55 hover:text-charcoal",
      ].join(" ")}
    >
      <span>{label}</span>
      {typeof count === "number" && (
        <span
          className={[
            "ml-1.5 tabular-nums",
            isSub ? "text-[9px]" : "text-[10px]",
            active ? "text-charcoal/55" : "text-charcoal/35",
          ].join(" ")}
        >
          {count}
        </span>
      )}
      {active && (
        <motion.div
          layoutId={layoutId}
          className={[
            "absolute left-2 right-2 bottom-0 bg-charcoal",
            isSub ? "h-[1px]" : "h-[1.5px]",
          ].join(" ")}
          transition={
            reduced
              ? { duration: 0 }
              : { type: "spring", stiffness: 500, damping: 35 }
          }
        />
      )}
    </button>
  );
}

interface OverviewBandsProps {
  buckets: Map<BrowseGroupId, CollectionProduct[]>;
  onSelectGroup: (id: BrowseGroupId) => void;
  onOpenProduct: (id: string) => void;
  onImageFailed: (id: string) => void;
}

const OVERVIEW_PREVIEW = 4;

/**
 * Owner-priority overview bands. Each band: heading · count · 4 preview tiles
 * · "View all" link. Pure white field, no card backgrounds, image-on-white.
 */
function OverviewBands({
  buckets,
  onSelectGroup,
  onOpenProduct,
  onImageFailed,
}: OverviewBandsProps) {
  const reduced = useReducedMotion();
  const entries = Array.from(buckets.entries());

  return (
    <div className="space-y-16">
      {entries.map(([id, items], sectionIdx) => {
        const preview = items.slice(0, OVERVIEW_PREVIEW);
        const label = BROWSE_GROUP_LABELS[id];
        return (
          <motion.section
            key={id}
            initial={reduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduced ? 0 : 0.4,
              delay: reduced ? 0 : Math.min(sectionIdx * 0.05, 0.3),
            }}
          >
            <div className="flex items-end justify-between mb-5 gap-4">
              <div className="min-w-0">
                <h2 className="font-display text-2xl md:text-3xl tracking-tight">
                  {label}
                </h2>
                <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-charcoal/45">
                  {items.length} {items.length === 1 ? "piece" : "pieces"}
                </p>
              </div>
              <button
                onClick={() => onSelectGroup(id)}
                className="flex-shrink-0 text-[11px] uppercase tracking-[0.2em] text-charcoal/70 hover:text-charcoal underline underline-offset-4 transition-colors"
              >
                View all {label.toLowerCase()} →
              </button>
            </div>

            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 lg:gap-4">
              {preview.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => onOpenProduct(p.id)}
                    className="group block w-full text-left bg-white"
                  >
                    <div className="aspect-square bg-white overflow-hidden">
                      {p.primaryImage ? (
                        <img
                          src={p.primaryImage.url}
                          alt={p.primaryImage.altText ?? p.title}
                          loading="lazy"
                          decoding="async"
                          onError={() => onImageFailed(p.id)}
                          className="w-full h-full object-contain p-3 transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      ) : null}
                    </div>
                    <p className="mt-2 text-[13px] text-charcoal/85 leading-snug line-clamp-2 group-hover:text-charcoal transition-colors">
                      {p.title}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </motion.section>
        );
      })}
    </div>
  );
}
