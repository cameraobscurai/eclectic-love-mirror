// Mirrors the public /collection browse process inside the Style Brief.
// Two levels:
//   1. CategoryTonalGrid — the same 15-tile checker shown on /collection.
//   2. Product grid for the selected category, with pin/unpin tiles.
// Clicking a product pins it via useInquiry() instead of navigating.

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Plus } from "lucide-react";
import { CategoryTonalGrid } from "@/components/collection/CategoryTonalGrid";
import {
  BROWSE_GROUP_LABELS,
  groupProductsByBrowseGroup,
  type BrowseGroupId,
} from "@/lib/collection-browse-groups";
import {
  getCollectionCatalog,
  type CollectionProduct,
} from "@/lib/phase3-catalog";
import { sortProductsForCollection } from "@/lib/collection-sort-intelligence";
import { useInquiry } from "@/hooks/use-inquiry";
import { withCdnWidth } from "@/lib/image-url";

const SORTS = ["type", "az", "tonal"] as const;
type SortKey = (typeof SORTS)[number];
const SORT_LABELS: Record<SortKey, string> = {
  type: "Type",
  az: "A–Z",
  tonal: "Tonal",
};


export function CollectionPicker() {
  const { has, toggle, ids } = useInquiry();
  const [products, setProducts] = useState<CollectionProduct[]>([]);
  const [active, setActive] = useState<BrowseGroupId | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("type");

  useEffect(() => {
    let alive = true;
    getCollectionCatalog().then((c) => {
      if (!alive) return;
      setProducts(c.products);
    });
    return () => {
      alive = false;
    };
  }, []);

  const buckets = useMemo(
    () => groupProductsByBrowseGroup(products),
    [products],
  );

  const groups = useMemo(
    () =>
      Array.from(buckets.entries()).map(([id, products]) => ({ id, products })),
    [buckets],
  );

  // Global search: when q is set with no active category, search across ALL.
  const globalSearchList = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term || active) return [];
    const rank = (p: CollectionProduct) => {
      const t = p.title.toLowerCase();
      if (t === term) return 0;
      if (t.startsWith(term)) return 1;
      return 2;
    };
    return products
      .filter((p) => p.title.toLowerCase().includes(term))
      .sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title))
      .slice(0, 60);
  }, [products, q, active]);

  const activeList = useMemo(() => {
    if (!active) return [];
    const base = buckets.get(active) ?? [];
    const term = q.trim().toLowerCase();

    if (term) {
      const rank = (p: CollectionProduct) => {
        const t = p.title.toLowerCase();
        if (t === term) return 0;
        if (t.startsWith(term)) return 1;
        return 2;
      };
      return base
        .filter((p) => p.title.toLowerCase().includes(term))
        .sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title));
    }

    return sortProductsForCollection(base, {
      mode: sort === "az" ? "az" : sort === "tonal" ? "tonal" : "by-type",
      activeGroup: active,
    });
  }, [active, buckets, q, sort]);


  return (
    <div>
      {/* Pinned count + back row */}
      <div className="flex items-center justify-between border-b border-charcoal/10 pb-3 mb-4">
        {active ? (
          <button
            type="button"
            onClick={() => {
              setActive(null);
              setQ("");
            }}
            className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-charcoal/70 hover:text-charcoal transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> All Categories
          </button>
        ) : (
          <span className="text-[10px] uppercase tracking-[0.28em] text-charcoal/50">
            Browse our collection
          </span>
        )}
        <span className="text-[10px] uppercase tracking-[0.28em] text-charcoal/55 tabular-nums">
          {ids.length} pinned
        </span>
      </div>

      {/* Global search — always available, searches across all categories
          when no category is active. */}
      {!active && (
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="SEARCH THE COLLECTION…"
          className="w-full bg-transparent border-b border-charcoal/20 px-1 py-2 mb-4 text-[11px] uppercase tracking-[0.22em] placeholder:text-charcoal/35 focus:outline-none focus:border-charcoal/60"
        />
      )}

      {!active && q.trim() ? (
        // Global search results — render product grid directly
        <div>
          <div className="flex items-baseline justify-between gap-4 mb-3">
            <h3 className="text-[10px] uppercase tracking-[0.22em] text-charcoal/55">
              Results
            </h3>
            <span className="text-[10px] uppercase tracking-[0.22em] text-charcoal/45 tabular-nums">
              {globalSearchList.length}
            </span>
          </div>
          {globalSearchList.length === 0 ? (
            <div className="py-16 text-center text-[11px] uppercase tracking-[0.22em] text-charcoal/40">
              No matches
            </div>
          ) : (
            <ProductGrid
              products={globalSearchList}
              has={has}
              toggle={toggle}
            />
          )}
        </div>
      ) : !active ? (
        // Level 1 — checker grid identical to /collection.
        // No fixed height: CategoryTonalGrid enforces grid-auto-rows
        // minmax(260px, 1fr), so 3 rows = ~780px. Capping the wrapper
        // shorter caused the bottom row to overflow into Step 3.
        // overflow-hidden is the safety net for any stray bleed.
        <div className="overflow-hidden">
          <CategoryTonalGrid
            groups={groups}
            onSelectCategory={(id) => setActive(id)}
          />
        </div>
      ) : (
        // Level 2 — products in the chosen category
        <div>
          <div className="flex items-baseline justify-between gap-4 mb-4">
            <h3 className="font-display text-[18px] uppercase tracking-[0.06em]">
              {BROWSE_GROUP_LABELS[active]}
            </h3>
            <span className="text-[10px] uppercase tracking-[0.22em] text-charcoal/45 tabular-nums">
              {activeList.length}{q ? ` of ${buckets.get(active)?.length ?? 0}` : ""}
            </span>
          </div>

          <div
            role="group"
            aria-label="Sort"
            className="flex flex-wrap items-center gap-4 mb-3"
          >
            <span className="text-[10px] uppercase tracking-[0.22em] text-charcoal/45">
              Sort
            </span>
            {SORTS.map((id) => {
              const isActive = sort === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSort(id)}
                  aria-pressed={isActive}
                  className={`text-[10px] uppercase tracking-[0.22em] py-1 transition-colors ${
                    isActive
                      ? "text-charcoal border-b border-charcoal"
                      : "text-charcoal/45 hover:text-charcoal/80"
                  }`}
                >
                  {SORT_LABELS[id]}
                </button>
              );
            })}
          </div>

          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`SEARCH ${BROWSE_GROUP_LABELS[active]}…`}
            className="w-full max-w-md bg-transparent border-b border-charcoal/20 px-1 py-2 mb-5 text-[11px] uppercase tracking-[0.22em] placeholder:text-charcoal/35 focus:outline-none focus:border-charcoal/60"
          />


          {activeList.length === 0 ? (
            <div className="py-16 text-center text-[11px] uppercase tracking-[0.22em] text-charcoal/40">
              {q ? "No matches" : "Nothing in this category yet"}
            </div>
          ) : (
            <ProductGrid products={activeList} has={has} toggle={toggle} />
          )}
        </div>
      )}
    </div>
  );
}

function ProductGrid({
  products,
  has,
  toggle,
}: {
  products: CollectionProduct[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
}) {
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {products.map((p) => {
        const pinned = has(String(p.id));
        const src = p.primaryImage?.url;
        return (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => toggle(String(p.id))}
              aria-pressed={pinned}
              className="group block w-full text-left"
            >
              <div
                className={`relative aspect-square bg-white overflow-hidden border transition-colors ${
                  pinned
                    ? "border-charcoal"
                    : "border-charcoal/10 hover:border-charcoal/40"
                }`}
              >
                {src ? (
                  <img
                    src={withCdnWidth(src, 400)}
                    alt={p.title}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-contain p-3"
                  />
                ) : (
                  <div className="absolute inset-0 bg-charcoal/[0.03]" />
                )}
                <span
                  className={`absolute top-1.5 right-1.5 h-5 w-5 grid place-items-center transition-all ${
                    pinned
                      ? "bg-charcoal text-cream opacity-100"
                      : "bg-cream/90 text-charcoal opacity-0 group-hover:opacity-100"
                  }`}
                >
                  {pinned ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                </span>
              </div>
              <p className="mt-1.5 text-[10px] uppercase tracking-[0.12em] text-charcoal/70 line-clamp-1">
                {p.title}
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
