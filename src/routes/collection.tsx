import { createFileRoute, useNavigate, ErrorComponent } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import type React from "react";
import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { LayoutGroup, AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import {
  getCollectionCatalog,
  type CollectionProduct,
  type CatalogPayload,
} from "@/lib/phase3-catalog";
import {
  BROWSE_GROUP_ORDER,
  type BrowseGroupId,
  getProductBrowseGroup,
} from "@/lib/collection-browse-groups";
import {
  PARENT_ORDER,
  PARENT_LABELS,
  TILE_TO_PARENT_SUB,
  GROUP_TO_PARENT,
  productParent,
  productMatchesSub,
  isParentId,
  isLegacyTileId,
  type ParentId,
} from "@/lib/collection-parents";
import { sortProductsForCollection } from "@/lib/collection-sort-intelligence";
import { ProductTile } from "@/components/collection/ProductTile";
import { InquiryTray } from "@/components/collection/InquiryTray";
import { SubcategoryRail } from "@/components/collection/SubcategoryRail";

import { CategoryTonalGrid } from "@/components/collection/CategoryTonalGrid";
import hiveSignatureHero from "@/assets/collection/hive-signature-hero.jpeg";
import { acquireScrollLock } from "@/lib/scroll-lock";
import { useScrollSpy } from "@/hooks/useScrollSpy";

// Quick View modal is split into its own chunk — only fetched when a tile
// is opened. ProductTile preloads on hover/focus so the chunk is already
// warm by the time the click resolves.
const QuickViewModal = lazy(() =>
  import("@/components/collection/QuickViewModal").then((m) => ({
    default: m.QuickViewModal,
  })),
);


const INITIAL_BATCH = 60;
const BATCH_INCREMENT = 60;
const SEARCH_DEBOUNCE_MS = 280;

const SORTS = ["type", "az", "tonal"] as const;
type SortKey = (typeof SORTS)[number];

const DENSITIES = ["comfortable", "dense"] as const;
type Density = (typeof DENSITIES)[number];

interface CollectionSearch {
  group: string; // ParentId | "" — semantics flipped from BrowseGroupId
  subcategory: string; // sub id within parent, or "all"
  q: string;
  sort: SortKey;
  density: Density;
  view: string;
}

const searchSchema = z.object({
  group: fallback(z.string(), "").default(""),
  subcategory: fallback(z.string(), "all").default("all"),
  q: fallback(z.string(), "").default(""),
  sort: fallback(z.enum(SORTS), "type").default("type"),
  density: fallback(z.enum(DENSITIES), "comfortable").default("comfortable"),
  view: fallback(z.string(), "").default(""),
});

// Shared inline styles for the floating search modal's suggestion rows.
// Kept at module scope so they're stable references and not recreated on
// every render of the modal IIFE.
const suggestionRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 14,
  width: "100%",
  textAlign: "left",
  background: "transparent",
  border: "none",
  borderBottom: "1px solid rgba(26,26,26,0.06)",
  padding: "10px 4px",
  cursor: "pointer",
  color: "#1a1a1a",
};
const suggestionGroupLabel: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "9px",
  letterSpacing: "0.24em",
  textTransform: "uppercase",
  color: "rgba(26,26,26,0.4)",
  margin: "0 0 8px",
};


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
    // Note: previously we preloaded CATEGORY_COVERS here. That preload now
    // lives inside <CategoryGalleryOverview> so it only runs when the
    // overview branch is actually rendered (not on direct category links or
    // the search view). TanStack Start's head() is route-level, so a
    // child-conditional preload requires the imperative pattern.
  }),
  validateSearch: zodValidator(searchSchema),
  loader: async (): Promise<CatalogPayload> => getCollectionCatalog(),
  // Paint a skeleton matching real layout immediately on slow connections,
  // suppress flicker on fast ones.
  pendingComponent: CollectionSkeleton,
  pendingMs: 0,
  pendingMinMs: 150,
  errorComponent: ({ error }) => <ErrorComponent error={error} />,
  notFoundComponent: () => <div className="p-12">Not found</div>,
  component: CollectionPage,
});

function CollectionSkeleton() {
  return (
    <main className="min-h-screen bg-white">
      {/* Sticky utility bar placeholder — matches real header height to
          prevent layout shift on hydration. */}
      <div
        className="sticky z-30 bg-white border-b border-charcoal/10"
        style={{
          top: "var(--nav-h)",
          height: "var(--archive-utility-h)",
        }}
      />
      <div className="px-6 lg:px-12 pt-10">
        <div className="mx-auto" style={{ maxWidth: "var(--archive-canvas-max)" }}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-charcoal/10">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white aspect-[4/3]" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function CollectionPage() {
  const data = Route.useLoaderData() as CatalogPayload;
  const { products, total } = data;
  const search = Route.useSearch() as CollectionSearch;
  const { group, subcategory, q, sort, density, view } = search;
  const navigate = useNavigate({ from: "/collection" });
  const reduced = useReducedMotion();

  // Parent + sub derived from URL. Legacy `?group=<BrowseGroupId>` is mapped
  // into the new shape on mount via the redirect effect below.
  const activeParent: ParentId | "" =
    group && isParentId(group) ? group : "";
  const activeSubcategory = activeParent ? subcategory || "all" : "all";

  // Migrate legacy URLs (?group=sofas etc.) → new (?group=lounge-seating&subcategory=sofas-loveseats).
  useEffect(() => {
    if (!group || isParentId(group)) return;
    if (isLegacyTileId(group)) {
      const { parent, sub } = TILE_TO_PARENT_SUB[group];
      navigate({
        search: (prev: CollectionSearch) => ({ ...prev, group: parent, subcategory: sub }),
        replace: true,
        resetScroll: false,
      });
    } else {
      // Unknown group string — clear it.
      navigate({
        search: (prev: CollectionSearch) => ({ ...prev, group: "", subcategory: "all" }),
        replace: true,
        resetScroll: false,
      });
    }
  }, [group, navigate]);

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

  // ---------- Floating search modal ----------
  const [searchOpen, setSearchOpen] = useState(false);
  const [modalQuery, setModalQuery] = useState("");
  // Debounce ref for modal commits — coalesces rapid Enter-mash / fast
  // suggestion clicks into a single navigate() so the URL (and the grid
  // fade) don't thrash. 140ms is short enough to feel instant but long
  // enough to absorb a typing burst.
  const modalCommitTimerRef = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (modalCommitTimerRef.current !== null) {
        window.clearTimeout(modalCommitTimerRef.current);
      }
    },
    [],
  );
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---------- Grid pending / transition state ----------
  // Two-phase fade:
  //   1. URL params (group / q / sort) change → mark grid pending.
  //   2. visibleProducts memo settles to a new reference → release pending
  //      on the next animation frame so the new tiles are already in the
  //      DOM when opacity returns to 1. This keeps the fade timed to the
  //      actual data swap, not to a fixed timer that can race React.
  // A safety timeout (500ms) guarantees we never get stuck dim if a memo
  // happens to return the same reference for back-to-back updates.
  // Grid fade removed — caused product cards to read as greyed out.


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

  // Body scroll lock + background inert (applied to <main>, NOT to the sheet).
  // Scroll lock goes through the shared ref-counted lock so overlapping
  // owners (Quick View + nav menu, etc.) don't race the inline overflow style.
  useEffect(() => {
    if (!sheetOpen) return undefined;
    const main = document.querySelector("main[data-collection-main]");
    const release = acquireScrollLock();
    if (main) {
      main.setAttribute("aria-hidden", "true");
      // `inert` is supported broadly now; setAttribute keeps TS happy.
      main.setAttribute("inert", "");
    }
    return () => {
      release();
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

  // Parent first, then subcategory. "All" is the no-op for sub, so a parent's
  // All view shows every product whose productParent === activeParent — even
  // items that fail every keyword bucket.
  const groupFiltered = useMemo(() => {
    if (!activeParent) return searchFiltered;
    const parentFiltered = searchFiltered.filter(
      (p) => productParent(p) === activeParent,
    );
    if (activeSubcategory === "all") return parentFiltered;
    return parentFiltered.filter((p) =>
      productMatchesSub(p, activeParent, activeSubcategory),
    );
  }, [searchFiltered, activeParent, activeSubcategory]);

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
      mode: sort === "az" ? "az" : sort === "tonal" ? "tonal" : "by-type",
      // When viewing a single parent (e.g. Cocktail & Bar), collapse the
      // owner-browse-group tier so products sort by raw ownerSiteRank —
      // matching the live site's continuous in-category order instead of
      // re-segmenting into bars→tables→storage buckets.
      activeGroup: activeParent ? (activeParent as never) : null,
    });
  }, [groupFiltered, sort, q, activeParent]);

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
  // Counts respond to the committed search-filtered set. Powers the rail's
  // per-row count badge.
  const groupCounts = useMemo(() => {
    const counts = new Map<BrowseGroupId, number>();
    for (const p of searchFiltered) {
      const id = getProductBrowseGroup(p);
      if (!id) continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }, [searchFiltered]);

  // ---------- Category overview screen ----------
  // The default Collection landing is the category gallery, NOT the 876-tile
  // grid. The product grid only mounts when the user picks a category or
  // types a search query. This is the answer to "All Inventory was never a
  // useful destination" — we removed it.
  const showOverview = !activeParent && !q.trim();

  const overviewGroups = useMemo(() => {
    // Bucket the full public-ready catalog by browse group, in display order.
    // Empty groups are excluded so every card is real and clickable.
    const buckets = new Map<BrowseGroupId, CollectionProduct[]>();
    for (const id of BROWSE_GROUP_ORDER) buckets.set(id, []);
    for (const p of products) {
      const id = getProductBrowseGroup(p);
      if (!id) continue;
      buckets.get(id)!.push(p);
    }
    return BROWSE_GROUP_ORDER.flatMap((id) => {
      const list = buckets.get(id)!;
      return list.length > 0 ? [{ id, products: list }] : [];
    });
  }, [products]);

  // ---------- Load More ----------
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);
  useEffect(() => {
    setVisibleCount(INITIAL_BATCH);
  }, [activeParent, q, sort]);
  const visibleBatch = useMemo(
    () => visibleProducts.slice(0, visibleCount),
    [visibleProducts, visibleCount],
  );
  const hasMore = visibleProducts.length > visibleCount;

  // Infinite-scroll sentinel — when this empty div enters the viewport
  // (with a generous rootMargin so the next batch is fetched before the
  // user reaches the end), bump the visible window by BATCH_INCREMENT.
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hasMore) return;
    const node = loadMoreSentinelRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisibleCount((c) =>
              Math.min(c + BATCH_INCREMENT, visibleProducts.length),
            );
            break;
          }
        }
      },
      { rootMargin: "1200px 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [hasMore, visibleProducts.length]);

  // ---------- Scroll-spy ----------
  // Reads `data-spy-section="<browseGroupId>"` off ProductTile <li> nodes and
  // produces an active group + per-group fill 0..1. Drives the right-edge
  // segmented progress rail and the left-rail quiet highlight.
  // Watch on visibleBatch.length re-scans bounds when the grid mutates
  // (filter / sort / Load More). Mutation observer inside the hook covers
  // the in-between cases (tiles entering via near-viewport gating).
  const { activeId: spyActiveId } =
    useScrollSpy({ watch: visibleBatch.length });
  const spyActiveGroup = (spyActiveId as BrowseGroupId | null) ?? null;

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

  // Body lock + scroll restore + focus return on Quick View open/close.
  // Uses the shared ref-counted scroll lock (see src/lib/scroll-lock.ts).
  useEffect(() => {
    if (!quickViewProduct) return undefined;
    const release = acquireScrollLock();
    return () => {
      release();
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

  const hasActiveFilters = !!(activeParent || q);
  const resetAll = () => {
    setQLocal("");
    navigate({
      search: () => ({
        group: "",
        subcategory: "all",
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

  // Selecting a parent always resets subcategory to "all".
  const selectParent = (parent: ParentId | "") => {
    navigate({
      search: (prev: CollectionSearch) => ({
        ...prev,
        group: parent,
        subcategory: "all",
      }),
      replace: true,
      resetScroll: false,
    });
    setSheetOpen(false);
  };

  // Selecting a subcategory updates only `subcategory`, never `group`.
  const selectSubcategory = (sub: string) => {
    navigate({
      search: (prev: CollectionSearch) => ({ ...prev, subcategory: sub }),
      replace: true,
      resetScroll: false,
    });
  };

  // Landing tile → translate BrowseGroupId into { parent, sub } and push both.
  const selectFromTile = (tileId: BrowseGroupId) => {
    const mapping = TILE_TO_PARENT_SUB[tileId];
    if (!mapping) return;
    navigate({
      search: (prev: CollectionSearch) => ({
        ...prev,
        group: mapping.parent,
        subcategory: mapping.sub,
      }),
      replace: true,
      resetScroll: false,
    });
  };

  const setDensity = (next: Density) => {
    navigate({
      search: (prev: CollectionSearch) => ({ ...prev, density: next }),
      replace: true,
      resetScroll: false,
    });
  };

  // ---- Result meta line text ----
  // The category name is owned by the rail. The utility bar stays silent
  // unless the user is actively searching.
  const trimmedQ = q.trim();
  let resultMeta: string;
  if (trimmedQ) {
    const n = visibleProducts.length;
    resultMeta = `${n} ${n === 1 ? "result" : "results"} matching “${trimmedQ}”`;
  } else {
    resultMeta = "";
  }

  const gridCols =
    density === "dense"
      ? "grid-cols-4 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8"
      : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4";

  const gridGapClasses =
    density === "dense" ? "gap-x-4 gap-y-2" : "gap-x-4 gap-y-3 lg:gap-x-5 lg:gap-y-4";

  // ---------- Heading height tracking (for sticky stack offset) ----------
  // The static "THE COLLECTION" block sits above the sticky utility bar.
  // The rail and the utility bar both stick beneath it, so we publish the
  // heading's measured height as a CSS var (`--collection-heading-h`) via a
  // ResizeObserver. One observer, one property, no recalculation loop.
  const headingRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const el = headingRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const apply = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty(
        "--collection-heading-h",
        `${h}px`,
      );
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--collection-heading-h");
    };
  }, []);

  // ---------- Utility bar scroll state ----------
  // Glass-frost the sticky utility bar once the user scrolls past the static
  // heading. White before scroll; frosted (products bleed through) when locked.
  const [utilityScrolled, setUtilityScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setUtilityScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main
      data-collection-main
      className="min-h-screen text-charcoal pb-32"
      style={{ background: "var(--paper)" }}
    >
      {/* Heading removed — the left "the HIVE" plate IS the page title. */}
      <div style={{ height: "var(--nav-h)" }} aria-hidden />


      {/* ============================================================
          UTILITY BAR — only shown when a category is active OR the user
          has a search query. On the overview screen it's hidden entirely
          (the rail + category gallery IS the navigation).
          No longer sticky — scrolls with the page as a normal block.
          ============================================================ */}
      {(activeParent || q.trim()) && (
      <div
        className="sticky z-30"
        style={{
          top: "var(--nav-h)",
          background: utilityScrolled
            ? "rgba(255,255,255,0.78)"
            : "var(--paper)",
          backdropFilter: utilityScrolled ? "blur(16px) saturate(140%)" : "none",
          WebkitBackdropFilter: utilityScrolled ? "blur(16px) saturate(140%)" : "none",
          borderTop: "1px solid var(--archive-rule)",
          borderBottom: "1px solid var(--archive-rule)",
          transition: "background 0.3s ease, backdrop-filter 0.3s ease",
        }}
      >
        <div className="px-4 sm:px-6 lg:px-12">
          <div
            className="mx-auto flex items-center justify-between gap-2 sm:gap-4 py-2 flex-wrap sm:flex-nowrap"
            style={{
              maxWidth: "var(--archive-canvas-max)",
              minHeight: "var(--archive-utility-h)",
            }}
          >
            {/* LEFT: mobile filters trigger + result meta. The Filters
                trigger is hidden on the category overview because browsing-
                by-category IS the filter — the trigger would open a sheet
                of the same rail that the user is already looking at. */}
            <div className="flex items-center gap-3 min-w-0">
              {!showOverview && (
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
              )}

              <p
                key={`${activeParent}-${q}-${sort}`}
                className="text-[11px] uppercase tracking-[0.22em] text-charcoal/60 hidden sm:flex items-center h-10 truncate"
                aria-live="polite"
              >
                {resultMeta}
              </p>
            </div>

            {/* RIGHT: search · sort · density.
                Hidden on the category overview — these controls operate on
                a product list that isn't shown there, so they're noise. */}
            {!showOverview && (
            <div className="flex items-center justify-end gap-2 sm:gap-3 min-w-0 flex-1">
              <label htmlFor="collection-search" className="sr-only">
                Search pieces
              </label>
              <input
                id="collection-search"
                type="text"
                inputMode="search"
                placeholder="Search"
                value={qLocal}
                onChange={(e) => setQLocal(e.target.value)}
                className="h-10 min-w-0 flex-1 sm:flex-none bg-transparent border-b border-charcoal/20 px-1 text-sm placeholder:text-charcoal/40 focus:outline-none focus:border-charcoal transition-colors"
                style={{ width: "auto", maxWidth: "280px" }}
              />

              <label
                htmlFor="collection-sort"
                className="hidden sm:inline-flex items-center h-10 whitespace-nowrap text-[10px] uppercase tracking-[0.22em] text-charcoal/55"
              >
                Sort
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
                <option value="tonal">Tonal (preview)</option>
                <option value="az">A–Z</option>
              </select>

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
            )}
          </div>

          {/* Contextual subcategory rail — taxonomy only, never inventory.
              Renders [All, ...PARENT_SUBS[activeParent]] for the active parent.
              The flattened 18-row rail (BROWSE_GROUP_ORDER.map) is gone. */}
          {activeParent && (
            <div className="px-0 pb-3">
              <div
                className="mx-auto"
                style={{ maxWidth: "var(--archive-canvas-max)" }}
              >
                <SubcategoryRail
                  parent={activeParent}
                  active={activeSubcategory}
                  onSelect={selectSubcategory}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* ============================================================
          BODY — permanent two-column layout.
          Left: CollectionRail (always visible on lg+).
          Right: overview gallery OR category hero + grid.
          ============================================================ */}
      <section className={showOverview ? "px-0 pt-0" : "px-6 lg:px-12 pt-0"}>
        <div
          className={showOverview ? "" : "mx-auto"}
          style={showOverview ? undefined : { maxWidth: "var(--archive-canvas-max)" }}
        >
          <LayoutGroup id="collection-overview">
          <motion.div
            layout={!reduced}
            transition={{ layout: { type: "spring", stiffness: 220, damping: 30, mass: 0.9 } }}
            className={showOverview ? "flex flex-col lg:flex-row lg:h-[calc(100dvh-var(--nav-h))] lg:overflow-hidden" : "grid grid-cols-1"}
          >
            {showOverview && (
              <motion.aside
                layout={!reduced}
                className="hidden lg:block flex-shrink-0"
                style={{
                  width: "40%",
                  background: "var(--paper)",
                }}
              >
                <img
                  src={hiveSignatureHero}
                  alt="The Hive — Signature Collection"
                  className="block w-full h-full object-cover"
                  width={1200}
                  height={1600}
                />
              </motion.aside>
            )}

            {/* ===== RIGHT: main pane ===== */}
            <motion.div
              layout={!reduced}
              className="min-w-0 flex-1 flex flex-col lg:min-h-0 lg:overflow-hidden"
              key={activeParent || (q.trim() ? "search" : "overview")}
              style={{
                animation: reduced ? undefined : "collection-fadein 150ms ease-out",
                background: "var(--paper)",
              }}
            >
              {showOverview ? (
                <>
                  {/* Mobile/tablet: H plate stacks on top, full width, square-ish */}
                  <div
                    className="lg:hidden flex items-center justify-center flex-shrink-0 border-b border-charcoal/10"
                    style={{
                      background: "var(--paper)",
                      containerType: "inline-size",
                      aspectRatio: "1 / 1",
                      padding: "clamp(16px, 6cqi, 40px)",
                    }}
                  >
                    <img
                      src={hiveSignatureHero}
                      alt="The Hive — Signature Collection"
                      className="block object-contain"
                      width={1200}
                      height={1600}
                      style={{ width: "min(100%, 88cqi)", height: "auto" }}
                    />
                  </div>
                  <div className="lg:flex-1 lg:min-h-0 lg:overflow-hidden">
                    <CategoryTonalGrid
                      groups={overviewGroups}
                      onSelectCategory={(id: BrowseGroupId) => selectFromTile(id)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      paddingLeft: 0,
                      paddingRight: "var(--archive-grid-gap-x)",
                      paddingTop: "1.75rem",
                      paddingBottom: "2rem",
                    }}
                  >
                    <div
                      ref={resultsTopRef}
                      id="results-top"
                      aria-hidden
                      style={{
                        scrollMarginTop:
                          "calc(var(--nav-h) + var(--archive-utility-h))",
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
                          <div
                            ref={loadMoreSentinelRef}
                            aria-hidden
                            className="h-10 w-full"
                          />
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
          </LayoutGroup>
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
              className="lg:hidden fixed inset-0 z-40 bg-charcoal/50"
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

              <div
                className="flex-1 overflow-y-auto px-4 py-3"
                style={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}
              >
                <p className="text-[10px] uppercase tracking-[0.24em] text-charcoal/45 px-1 pb-3">
                  Browse by Category
                </p>
                <ul role="list" className="flex flex-col">
                  {PARENT_ORDER.map((pid) => {
                    const isActive = activeParent === pid;
                    return (
                      <li key={pid}>
                        <button
                          type="button"
                          onClick={() => {
                            selectParent(pid);
                            setSheetOpen(false);
                          }}
                          className={[
                            "w-full text-left px-1 py-3 text-[12px] uppercase tracking-[0.22em] border-b border-charcoal/8",
                            isActive ? "text-charcoal" : "text-charcoal/65 hover:text-charcoal",
                          ].join(" ")}
                          aria-current={isActive ? "page" : undefined}
                        >
                          {PARENT_LABELS[pid]}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {activeParent && (
                  <div className="pt-5">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-charcoal/45 px-1 pb-3">
                      {PARENT_LABELS[activeParent]}
                    </p>
                    <SubcategoryRail
                      parent={activeParent}
                      active={activeSubcategory}
                      onSelect={(s) => {
                        selectSubcategory(s);
                        setSheetOpen(false);
                      }}
                    />
                  </div>
                )}
              </div>

              <div
                className="px-6 py-4 border-t border-charcoal/10"
                style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
              >
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

      <Suspense fallback={null}>
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
      </Suspense>

      <InquiryTray />

      {/* ============================================================
          FLOATING SEARCH BUTTON — bottom-right, always visible.
          Opens a full-viewport frosted search modal.
          ============================================================ */}
      <button
        onClick={() => setSearchOpen(true)}
        aria-label="Search the collection"
        style={{
          position: "fixed",
          bottom: "clamp(24px, 3vh, 40px)",
          right: "clamp(24px, 3vw, 40px)",
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          background: "rgba(26,26,26,0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 40,
          boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="6.5" cy="6.5" r="4.5" stroke="rgba(245,242,237,0.85)" strokeWidth="1.2" />
          <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="rgba(245,242,237,0.85)" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </button>

      {searchOpen && (() => {
        // ---- Live suggestion engine (recomputed each render while open) ----
        const raw = modalQuery.trim().toLowerCase();
        // Categories suggested in the modal are the 10 PARENTS, never the
        // legacy 18 BrowseGroupIds — that would re-introduce the flattened
        // taxonomy through the back door.
        const matchedCategories = raw
          ? PARENT_ORDER.filter((id) =>
              PARENT_LABELS[id].toLowerCase().includes(raw),
            ).slice(0, 4)
          : [];
        const matchedProducts = raw
          ? products
              .filter((p) => p.title.toLowerCase().includes(raw))
              .slice(0, 8)
          : [];

        const DEBOUNCE_MS = 140;
        const scheduleCommit = (fn: () => void) => {
          if (modalCommitTimerRef.current !== null) {
            window.clearTimeout(modalCommitTimerRef.current);
          }
          modalCommitTimerRef.current = window.setTimeout(() => {
            modalCommitTimerRef.current = null;
            fn();
          }, DEBOUNCE_MS);
        };
        const commitQuery = (text: string) => {
          const next = text.trim();
          if (!next) return;
          setSearchOpen(false);
          setModalQuery("");
          scheduleCommit(() => {
            setQLocal(next);
            navigate({
              search: (prev: CollectionSearch) => ({
                ...prev,
                group: "",
                subcategory: "all",
                q: next,
                view: "",
              }),
              replace: true,
              resetScroll: false,
            });
          });
        };
        const commitCategory = (id: ParentId) => {
          setSearchOpen(false);
          setModalQuery("");
          scheduleCommit(() => {
            setQLocal("");
            navigate({
              search: (prev: CollectionSearch) => ({
                ...prev,
                group: id,
                subcategory: "all",
                q: "",
                view: "",
              }),
              replace: true,
              resetScroll: false,
            });
          });
        };

        return (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSearchOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            // Tight on phones, spacious on desktop. Side padding shrinks
            // hard on narrow screens so the input + ESC button always fit.
            padding:
              "clamp(56px, 10vh, 140px) clamp(14px, 6vw, 120px) clamp(20px, 4vh, 40px)",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "640px",
              borderBottom: "1px solid rgba(26,26,26,0.15)",
              display: "flex",
              alignItems: "center",
              gap: "clamp(8px, 2vw, 14px)",
              paddingBottom: "12px",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              style={{ opacity: 0.35, flexShrink: 0 }}
            >
              <circle cx="6.5" cy="6.5" r="4.5" stroke="#1a1a1a" strokeWidth="1.2" />
              <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="#1a1a1a" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <input
              autoFocus
              value={modalQuery}
              onChange={(e) => setModalQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && modalQuery.trim()) {
                  commitQuery(modalQuery);
                }
              }}
              placeholder="Search the collection"
              style={{
                flex: 1,
                minWidth: 0,
                border: "none",
                outline: "none",
                background: "transparent",
                fontFamily: "var(--font-display)",
                // Smaller on phones so input + ESC fit without scaling.
                fontSize: "clamp(18px, 5vw, 36px)",
                color: "#1a1a1a",
                letterSpacing: "-0.01em",
              }}
            />
            <button
              onClick={() => setSearchOpen(false)}
              aria-label="Close search"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "9px",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "rgba(26,26,26,0.55)",
                background: "none",
                border: "1px solid rgba(26,26,26,0.18)",
                cursor: "pointer",
                flexShrink: 0,
                padding: "5px 8px",
                lineHeight: 1,
              }}
            >
              ESC
            </button>
          </div>

          {/* Suggestions / footer area */}
          <div
            style={{
              width: "100%",
              maxWidth: "640px",
              marginTop: "clamp(18px, 3vh, 28px)",
            }}
          >
            {raw.length === 0 ? (
              <div>
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "10px",
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "rgba(26,26,26,0.32)",
                    margin: "0 0 14px",
                  }}
                >
                  {total} pieces across {overviewGroups.length} categories
                </p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {PARENT_ORDER.slice(0, 6).map((id) => {
                    const label = PARENT_LABELS[id];
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          onClick={() => commitCategory(id)}
                          style={suggestionRowStyle}
                        >
                          <span
                            style={{
                              fontSize: "9px",
                              letterSpacing: "0.22em",
                              textTransform: "uppercase",
                              color: "rgba(26,26,26,0.4)",
                              minWidth: 70,
                            }}
                          >
                            Category
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--font-display)",
                              fontSize: "clamp(15px, 2vw, 18px)",
                              color: "#1a1a1a",
                            }}
                          >
                            {label}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <div>
                {matchedCategories.length === 0 && matchedProducts.length === 0 ? (
                  <p
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "11px",
                      color: "rgba(26,26,26,0.55)",
                      margin: 0,
                    }}
                  >
                    No matches. Press Enter to search anyway.
                  </p>
                ) : (
                  <>
                    {matchedCategories.length > 0 && (
                      <div style={{ marginBottom: 18 }}>
                        <p style={suggestionGroupLabel}>Categories</p>
                        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                          {matchedCategories.map((id) => {
                            const label = PARENT_LABELS[id];
                            return (
                              <li key={id}>
                                <button
                                  type="button"
                                  onClick={() => commitCategory(id)}
                                  style={suggestionRowStyle}
                                >
                                  <span
                                    style={{
                                      fontFamily: "var(--font-display)",
                                      fontSize: "clamp(15px, 2vw, 18px)",
                                      color: "#1a1a1a",
                                    }}
                                  >
                                    {label}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    {matchedProducts.length > 0 && (
                      <div>
                        <p style={suggestionGroupLabel}>Pieces</p>
                        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                          {matchedProducts.map((p) => (
                            <li key={p.id}>
                              <button
                                type="button"
                                onClick={() => commitQuery(p.title)}
                                style={suggestionRowStyle}
                              >
                                <span
                                  style={{
                                    fontFamily: "var(--font-display)",
                                    fontSize: "clamp(14px, 1.8vw, 16px)",
                                    color: "#1a1a1a",
                                    textAlign: "left",
                                  }}
                                >
                                  {p.title}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: "10px",
                        letterSpacing: "0.22em",
                        textTransform: "uppercase",
                        color: "rgba(26,26,26,0.32)",
                        margin: "18px 0 0",
                      }}
                    >
                      Press Enter to search all {total} pieces
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ----------------------------------------------------------------
              Scope indicator — pinned to the bottom of the modal panel,
              always visible. The modal's search applies to ALL inventory
              regardless of which section the user launched from. The inline
              utility-bar input stays section-scoped, so this label exists
              specifically to set that expectation.
              ---------------------------------------------------------------- */}
          <div
            style={{
              marginTop: "auto",
              paddingTop: "clamp(20px, 4vh, 32px)",
              width: "100%",
              maxWidth: "640px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "rgba(26,26,26,0.55)",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "9px",
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "rgba(26,26,26,0.55)",
                lineHeight: 1.4,
              }}
            >
              Searching all {total} pieces · {overviewGroups.length} categories
            </span>
            {activeParent && (
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "9px",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "rgba(26,26,26,0.35)",
                  marginLeft: "auto",
                }}
                title="The bar inside a category stays section-scoped. The modal does not."
              >
                Bar: {PARENT_LABELS[activeParent]} only
              </span>
            )}
          </div>
        </div>
        );
      })()}
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
