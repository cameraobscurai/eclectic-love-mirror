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
import { useInquiry } from "@/hooks/use-inquiry";
import { withCdnWidth } from "@/lib/image-url";

export function CollectionPicker() {
  const { has, toggle, ids } = useInquiry();
  const [products, setProducts] = useState<CollectionProduct[]>([]);
  const [active, setActive] = useState<BrowseGroupId | null>(null);
  const [q, setQ] = useState("");

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

  const activeList = useMemo(() => {
    if (!active) return [];
    const list = buckets.get(active) ?? [];
    const term = q.trim().toLowerCase();
    return term
      ? list.filter((p) => p.title.toLowerCase().includes(term))
      : list;
  }, [active, buckets, q]);

  return (
    <div>
      {/* Pinned count + back row */}
      <div className="flex items-center justify-between border-b border-charcoal/10 pb-3 mb-5">
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
            Browse By Category
          </span>
        )}
        <span className="text-[10px] uppercase tracking-[0.28em] text-charcoal/55 tabular-nums">
          {ids.length} pinned
        </span>
      </div>

      {!active ? (
        // Level 1 — checker grid identical to /collection
        <div className="h-[min(72vh,820px)]">
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
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {activeList.map((p) => {
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
                          {pinned ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Plus className="h-3 w-3" />
                          )}
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
          )}
        </div>
      )}
    </div>
  );
}
