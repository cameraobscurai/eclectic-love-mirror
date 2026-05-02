import { createFileRoute, useNavigate, ErrorComponent } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutGroup, AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import {
  getCollectionCatalog,
  type CollectionProduct,
  type CatalogPayload,
} from "@/lib/phase3-catalog";
import {
  BROWSE_GROUP_ORDER,
  BROWSE_GROUP_LABELS,
  type BrowseGroupId,
  getProductBrowseGroup,
} from "@/lib/collection-browse-groups";
import { sortProductsForCollection } from "@/lib/collection-sort-intelligence";
import { ProductTile } from "@/components/collection/ProductTile";
import { QuickViewModal } from "@/components/collection/QuickViewModal";
import { InquiryTray } from "@/components/collection/InquiryTray";
import { CollectionFilterRail } from "@/components/collection/CollectionFilterRail";

const INITIAL_BATCH = 60;
const BATCH_INCREMENT = 60;
const SEARCH_DEBOUNCE_MS = 280;

const SORTS = ["type", "az"] as const;
type SortKey = (typeof SORTS)[number];

const DENSITIES = ["comfortable", "dense"] as const;
type Density = (typeof DENSITIES)[number];

interface CollectionSearch {
  group: string;
  q: string;
  sort: SortKey;
  density: Density;
  view: string;
}

const searchSchema = z.object({
  group: fallback(z.string(), "").default(""),
  q: fallback(z.string(), "").default(""),
  sort: fallback(z.enum(SORTS), "type").default("type"),
  density: fallback(z.enum(DENSITIES), "comfortable").default("comfortable"),
  view: fallback(z.string(), "").default(""),
});

const BROWSE_GROUP_SET = new Set<string>(BROWSE_GROUP_ORDER);

const COLLECTION_INTRO =
  "A living inventory of furniture, lighting, tableware, and bespoke objects available for rental.";

export const Route = createFileRoute("/collection")({
  head: () => ({
    meta: [
      { title: "Hive Signature Collection — Inventory | Eclectic Hive" },
      {
        name: "description",
        content:
          "A living inventory of furniture, lighting, tableware, and bespoke objects available for rental from Eclectic Hive.",
      },
      { property: "og:title", content: "Hive Signature Collection — Eclectic Hive" },
      {
        property: "og:description",
        content:
          "A living inventory of furniture, lighting, tableware, and bespoke objects available for rental.",
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
  const { group, q, sort, density, view } = search;
  const navigate = useNavigate({ from: "/collection" });
  const reduced = useReducedMotion();

  const activeGroup: BrowseGroupId | "" =
    group && BROWSE_GROUP_SET.has(group) ? (group as BrowseGroupId) : "";

  // ---------- history.scrollRestoration guard ----------
  // Pin to "manual" while the route is mounted so opening/closing Quick View
  // never causes the document to jump. Restore the previous value on unmount.
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const prev = window.history.scrollRestoration;
    try {
      window.history.scrollRestoration = "manual";
    } catch {
      /* ignore — older browsers */
    }
    return () => {
      try {
        window.history.scrollRestoration = prev;
      } catch {
        /* ignore */
      }
    };
  }, []);

  // ---------- Debounced search input ----------
  const [qLocal, setQLocal] = useState(q);
  useEffect(() => setQLocal(q), [q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (qLocal !== q) {
        navigate({
          search: (prev: CollectionSearch) => ({ ...prev, q: qLocal }),
          replace: true,
          // Search input mutates URL state in place. Never reset scroll.
          resetScroll: false,
        });
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qLocal]);

  // ---------- Mobile filter sheet ----------
  const [sheetOpen, setSheetOpen] = useState(false);
  const filtersTriggerRef = useRef<HTMLButtonElement>(null);
  const sheetCloseRef = useRef<HTMLButtonElement>(null);
  const sheetPanelRef = useRef<HTMLDivElement>(null);

  // Body scroll lock + background inert (applied to <main>, NOT to the sheet)
  useEffect(() => {
    if (!sheetOpen) return undefined;
    const main = document.querySelector("main[data-collection-main]");
    document.body.style.overflow = "hidden";
    if (main) {
      main.setAttribute("aria-hidden", "true");
      // `inert` is supported broadly now; setAttribute keeps TS happy.
      main.setAttribute("inert", "");
    }
    return () => {
      document.body.style.removeProperty("overflow");
      if (main) {
        main.removeAttribute("aria-hidden");
        main.removeAttribute("inert");
      }
    };
  }, [sheetOpen]);

  // Focus management for the sheet: focus close on open, return focus on close
  useEffect(() => {
    if (!sheetOpen) return undefined;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // RAF so the sheet has actually mounted
    const r = requestAnimationFrame(() => sheetCloseRef.current?.focus());
    return () => {
      cancelAnimationFrame(r);
      // Return focus to the Filters trigger if it's still in the DOM
      if (filtersTriggerRef.current && document.contains(filtersTriggerRef.current)) {
        filtersTriggerRef.current.focus();
      } else if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [sheetOpen]);

  // Lightweight focus trap inside the sheet panel
  useEffect(() => {
    if (!sheetOpen) return undefined;
    const panel = sheetPanelRef.current;
    if (!panel) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setSheetOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), select, input, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener("keydown", onKey);
    return () => panel.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  // ====== FILTER PIPELINE ======

  const searchFiltered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return products;
    return products.filter((p) => p.title.toLowerCase().includes(query));
  }, [products, q]);

  const groupFiltered = useMemo(() => {
    if (!activeGroup) return searchFiltered;
    return searchFiltered.filter((p) => getProductBrowseGroup(p) === activeGroup);
  }, [searchFiltered, activeGroup]);

  const filtered = useMemo(() => {
    const list = [...groupFiltered];
    const query = q.trim().toLowerCase();

    // Search-rank trumps the chosen sort while a query is active.
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

    return sortProductsForCollection(list, {
      mode: sort === "az" ? "az" : "by-type",
    });
  }, [groupFiltered, sort, q]);

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

  // ---------- Filter rail data: stable order + responsive counts ----------
  // Order is fixed once from the FULL public-ready catalog. It does not move
  // while the user types or filters.
  const orderedGroupIds = useMemo<BrowseGroupId[]>(() => {
    const seen = new Set<BrowseGroupId>();
    for (const p of products) {
      const id = getProductBrowseGroup(p);
      if (id) seen.add(id);
    }
    return BROWSE_GROUP_ORDER.filter((id) => seen.has(id));
  }, [products]);

  // Counts respond to the committed search-filtered set.
  const groupCounts = useMemo(() => {
    const counts = new Map<BrowseGroupId, number>();
    for (const p of searchFiltered) {
      const id = getProductBrowseGroup(p);
      if (!id) continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }, [searchFiltered]);

  const allCount = searchFiltered.length;

  // ---------- Load More ----------
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);
  useEffect(() => {
    setVisibleCount(INITIAL_BATCH);
  }, [activeGroup, q, sort]);
  const visibleBatch = useMemo(
    () => visibleProducts.slice(0, visibleCount),
    [visibleProducts, visibleCount],
  );
  const hasMore = visibleProducts.length > visibleCount;

  // ---------- Results anchor ----------
  // Anchor kept for #results-top deep links and skip-to-results affordances.
  // We deliberately do NOT auto-scroll the page on filter / search / sort
  // commits — every navigate() in this route opts out of router scroll
  // restoration via `resetScroll: false`. Selecting a category should leave
  // the user exactly where they are, just with a new product list under the
  // sticky utility row.
  const resultsTopRef = useRef<HTMLDivElement>(null);

  // ---------- Quick View — URL-driven + scroll snapshot + focus return ----
  const grabbedScrollY = useRef<number | null>(null);
  // Remember which tile opened the modal so we can return focus on close.
  const openerRef = useRef<HTMLElement | null>(null);
  const setQuickViewId = (id: string | null) => {
    if (id !== null && grabbedScrollY.current === null) {
      grabbedScrollY.current = window.scrollY;
      // Snapshot the active element (the tile button) for focus return.
      openerRef.current = document.activeElement as HTMLElement | null;
    }
    navigate({
      search: (prev: CollectionSearch) => ({ ...prev, view: id ?? "" }),
      replace: false,
      // Opening / closing Quick View must never scroll the underlying grid.
      resetScroll: false,
    });
  };
  const quickViewIndex = useMemo(() => {
    if (!view) return -1;
    return visibleProducts.findIndex((p) => p.id === view || p.slug === view);
  }, [visibleProducts, view]);
  const quickViewProduct: CollectionProduct | null =
    quickViewIndex >= 0 ? visibleProducts[quickViewIndex] : null;

  // Body lock + scroll restore + focus return on Quick View open/close
  useEffect(() => {
    if (!quickViewProduct) return undefined;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.removeProperty("overflow");
      // Restore the grid scroll position so the user lands where they left.
      const y = grabbedScrollY.current;
      grabbedScrollY.current = null;
      const opener = openerRef.current;
      openerRef.current = null;
      if (y !== null) {
        requestAnimationFrame(() => {
          window.scrollTo({ top: y, behavior: "auto" });
          // Return focus to the originating tile if it's still in the DOM.
          if (opener && document.contains(opener)) {
            opener.focus({ preventScroll: true });
          }
        });
      }
    };
  }, [quickViewProduct]);

  const hasActiveFilters = !!(activeGroup || q);
  const resetAll = () => {
    setQLocal("");
    navigate({
      search: () => ({
        group: "",
        q: "",
        sort: "type" as SortKey,
        density,
        view: "",
      }),
      replace: true,
      // Stay where we are — clearing filters should not yank the page.
      resetScroll: false,
    });
  };

  const selectGroup = (id: BrowseGroupId | "") => {
    navigate({
      search: (prev: CollectionSearch) => ({ ...prev, group: id }),
      replace: true,
      // Category click must NEVER scroll to top. The sticky utility row
      // and filter rail keep their position; only the grid swaps.
      resetScroll: false,
    });
    setSheetOpen(false);
  };

  const setDensity = (next: Density) => {
    navigate({
      search: (prev: CollectionSearch) => ({ ...prev, density: next }),
      replace: true,
      resetScroll: false,
    });
  };

  // ---- Result meta line text ----
  // Spec: "876 pieces" for browse, "Sofas · 44 pieces" for group,
  // "24 results matching '...'" for search.
  const groupLabel = activeGroup ? BROWSE_GROUP_LABELS[activeGroup] : null;
  const trimmedQ = q.trim();
  let resultMeta: string;
  if (trimmedQ) {
    const n = visibleProducts.length;
    resultMeta = `${n} ${n === 1 ? "result" : "results"} matching “${trimmedQ}”`;
  } else if (groupLabel) {
    const n = visibleProducts.length;
    resultMeta = `${groupLabel} · ${n} ${n === 1 ? "piece" : "pieces"}`;
  } else {
    resultMeta = `${visibleProducts.length} pieces`;
  }

  const gridCols =
    density === "dense"
      ? "grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7"
      : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

  const gridGapClasses =
    density === "dense"
      ? "gap-x-9 gap-y-14 lg:gap-x-12 lg:gap-y-16"
      : "gap-x-12 gap-y-20 lg:gap-x-14 lg:gap-y-24";

  return (
    <main
      data-collection-main
      className="min-h-screen bg-white text-charcoal pb-32"
    >
      {/* Hero — quiet, archive-style */}
      <section
        className="px-6 lg:px-12"
        style={{
          paddingTop: "clamp(64px, 7vw, 112px)",
          paddingBottom: "clamp(48px, 5vw, 80px)",
        }}
      >
        <div className="max-w-[1600px] mx-auto">
          <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/50">
            HIVE SIGNATURE COLLECTION
          </p>
          <h1 className="mt-4 font-display text-[clamp(2.5rem,6vw,5rem)] leading-[1] tracking-tight">
            The Collection
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-charcoal/70">
            {COLLECTION_INTRO}
          </p>
        </div>
      </section>

      {/* Sticky control bar — single row, 64px min height, baseline-aligned */}
      <div
        className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-y"
        style={{ borderColor: "var(--archive-rule)" }}
      >
        <div className="px-6 lg:px-12">
          <div
            className="max-w-[1600px] mx-auto flex items-center gap-3 py-2"
            style={{ minHeight: "var(--archive-utility-h)" }}
          >
            {/* Mobile: filters trigger */}
            <button
              ref={filtersTriggerRef}
              onClick={() => setSheetOpen(true)}
              className="lg:hidden inline-flex items-center gap-2 h-10 px-3 border border-charcoal/15 text-[11px] uppercase tracking-[0.2em] hover:bg-charcoal hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white transition-colors"
              aria-label="Open filters"
              aria-haspopup="dialog"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
              {hasActiveFilters && (
                <span
                  aria-hidden
                  className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-current"
                />
              )}
            </button>

            <motion.p
              key={`${activeGroup}-${q}-${sort}`}
              initial={reduced ? { opacity: 1 } : { opacity: 0.4 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reduced ? 0 : 0.25 }}
              className="text-[11px] uppercase tracking-[0.2em] text-charcoal/60 flex-shrink-0 hidden sm:flex items-center h-10"
              aria-live="polite"
            >
              {resultMeta}
            </motion.p>

            <div className="flex-1" />

            <label htmlFor="collection-search" className="sr-only">
              Search pieces
            </label>
            <input
              id="collection-search"
              type="text"
              inputMode="search"
              placeholder="Search pieces"
              value={qLocal}
              onChange={(e) => setQLocal(e.target.value)}
              className="h-10 w-32 sm:w-56 bg-transparent border-b border-charcoal/20 px-1 text-sm placeholder:text-charcoal/40 focus:outline-none focus:border-charcoal transition-colors"
            />

            <label
              htmlFor="collection-sort"
              className="hidden sm:inline-flex items-center h-10 whitespace-nowrap text-[10px] uppercase tracking-[0.22em] text-charcoal/55"
            >
              Sort by
            </label>
            <select
              id="collection-sort"
              value={sort}
              onChange={(e) =>
                navigate({
                  search: (prev: CollectionSearch) => ({
                    ...prev,
                    sort: e.target.value as SortKey,
                  }),
                  replace: true,
                  resetScroll: false,
                })
              }
              className="h-10 bg-transparent border-b border-charcoal/20 px-1 text-sm text-charcoal focus:outline-none focus:border-charcoal transition-colors"
            >
              <option value="type">By Type</option>
              <option value="az">A–Z</option>
            </select>

            {/* Density toggle — desktop only. Quiet active state: thin frame
                + charcoal glyph instead of inverted black plate. */}
            <div
              className="hidden lg:flex items-center border border-charcoal/10"
              role="group"
              aria-label="Grid density"
            >
              <button
                onClick={() => setDensity("comfortable")}
                className={[
                  "h-10 w-10 inline-flex items-center justify-center transition-colors",
                  "focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                  density === "comfortable"
                    ? "text-charcoal bg-charcoal/[0.04]"
                    : "text-charcoal/40 hover:text-charcoal/80",
                ].join(" ")}
                aria-label="Comfortable grid"
                aria-pressed={density === "comfortable"}
              >
                <DensityIconLarge />
              </button>
              <button
                onClick={() => setDensity("dense")}
                className={[
                  "h-10 w-10 inline-flex items-center justify-center transition-colors border-l border-charcoal/10",
                  "focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                  density === "dense"
                    ? "text-charcoal bg-charcoal/[0.04]"
                    : "text-charcoal/40 hover:text-charcoal/80",
                ].join(" ")}
                aria-label="Dense grid"
                aria-pressed={density === "dense"}
              >
                <DensityIconSmall />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Body — left filter rail + grid */}
      <section className="px-6 lg:px-12 pt-10">
        <div
          className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[var(--archive-rail-width)_minmax(0,1fr)]"
          style={{ columnGap: "var(--archive-grid-gap-x)", rowGap: "2.5rem" }}
        >
          {/* Desktop filter rail */}
          <aside className="hidden lg:block">
            <CollectionFilterRail
              orderedGroupIds={orderedGroupIds}
              counts={groupCounts}
              totalCount={allCount}
              activeGroup={activeGroup}
              onSelect={selectGroup}
              onClear={resetAll}
              hasActiveFilters={hasActiveFilters}
            />
          </aside>

          {/* Grid */}
          <div className="min-w-0">
            {/* Scroll-to-results anchor (offset for sticky utility bar) */}
            <div
              ref={resultsTopRef}
              id="results-top"
              aria-hidden
              style={{
                scrollMarginTop: "calc(var(--nav-h) + var(--archive-utility-h))",
              }}
            />

            {visibleProducts.length === 0 ? (
              <div className="py-32">
                <p className="text-[15px] leading-relaxed text-charcoal/70">
                  No pieces match the current filters.
                </p>
                <button
                  onClick={resetAll}
                  className="mt-6 text-[10px] uppercase tracking-[0.22em] text-charcoal/55 hover:text-charcoal underline underline-offset-4 focus:outline-none focus-visible:ring-1 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white transition-colors"
                >
                  Clear All
                </button>
              </div>
            ) : (
              <>
                <LayoutGroup id="collection-grid">
                  <motion.ul
                    layout
                    className={`grid ${gridCols} ${gridGapClasses}`}
                    transition={
                      reduced
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 260, damping: 32, mass: 0.8 }
                    }
                  >
                    <AnimatePresence mode="popLayout">
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
                      className="px-8 py-3 border border-charcoal/30 text-xs uppercase tracking-[0.2em] text-charcoal hover:bg-charcoal hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white transition-colors active:scale-[0.98]"
                    >
                      Load more ({visibleProducts.length - visibleBatch.length} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Mobile filter bottom-sheet — rendered OUTSIDE <main> so inert on
          <main> never accidentally inerts the sheet itself. */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              key="sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.2 }}
              onClick={() => setSheetOpen(false)}
              className="lg:hidden fixed inset-0 z-40 bg-charcoal/40 backdrop-blur-sm"
              aria-hidden
            />
            <motion.div
              key="sheet"
              ref={sheetPanelRef}
              initial={reduced ? { opacity: 0 } : { y: "100%" }}
              animate={reduced ? { opacity: 1 } : { y: 0 }}
              exit={reduced ? { opacity: 0 } : { y: "100%" }}
              transition={
                reduced
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 320, damping: 34 }
              }
              drag={reduced ? false : "y"}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.3 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 120 || info.velocity.y > 400) {
                  setSheetOpen(false);
                }
              }}
              className="lg:hidden fixed inset-x-0 bottom-0 z-50 max-h-[85vh] bg-white rounded-t-2xl shadow-2xl flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-label="Filters"
            >
              {/* Drag handle */}
              <div
                className="pt-2.5 pb-1 flex justify-center"
                aria-hidden
              >
                <div className="h-1 w-10 bg-charcoal/15 rounded-full" />
              </div>

              <div className="flex items-center justify-between px-6 pt-2 pb-3 border-b border-charcoal/10">
                <p className="text-[11px] uppercase tracking-[0.25em] text-charcoal/70">
                  Filters
                </p>
                <button
                  ref={sheetCloseRef}
                  onClick={() => setSheetOpen(false)}
                  className="w-11 h-11 inline-flex items-center justify-center text-charcoal/60 hover:text-charcoal focus:outline-none focus-visible:ring-2 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  aria-label="Close filters"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                <CollectionFilterRail
                  orderedGroupIds={orderedGroupIds}
                  counts={groupCounts}
                  totalCount={allCount}
                  activeGroup={activeGroup}
                  onSelect={selectGroup}
                  onClear={() => {
                    resetAll();
                    setSheetOpen(false);
                  }}
                  hasActiveFilters={hasActiveFilters}
                  variant="sheet"
                />
              </div>

              <div className="px-6 py-4 border-t border-charcoal/10">
                <button
                  onClick={() => setSheetOpen(false)}
                  className="w-full h-12 bg-charcoal text-white text-[11px] uppercase tracking-[0.2em] hover:bg-charcoal/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white transition-colors"
                >
                  Show {visibleProducts.length}{" "}
                  {visibleProducts.length === 1 ? "piece" : "pieces"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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

function DensityIconLarge() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect x="1" y="1" width="5.5" height="5.5" stroke="currentColor" strokeWidth="1" />
      <rect x="7.5" y="1" width="5.5" height="5.5" stroke="currentColor" strokeWidth="1" />
      <rect x="1" y="7.5" width="5.5" height="5.5" stroke="currentColor" strokeWidth="1" />
      <rect x="7.5" y="7.5" width="5.5" height="5.5" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function DensityIconSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      {[0, 1, 2].flatMap((row) =>
        [0, 1, 2].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={1 + col * 4.25}
            y={1 + row * 4.25}
            width="3.5"
            height="3.5"
            stroke="currentColor"
            strokeWidth="0.9"
          />
        )),
      )}
    </svg>
  );
}
