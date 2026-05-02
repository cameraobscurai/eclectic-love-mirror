import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useMemo, useRef, useState } from "react";
import { ErrorComponent } from "@tanstack/react-router";
import { getCollectionCatalog } from "@/server/phase3-catalog.functions";
import {
  CATEGORY_DISPLAY_ORDER,
  type CollectionProduct,
} from "@/server/phase3-catalog.server";
import { cn } from "@/lib/utils";
import { useInquiry } from "@/hooks/use-inquiry";

const SORTS = ["type", "az", "newest", "oldest"] as const;
type SortKey = (typeof SORTS)[number];

const searchSchema = z.object({
  category: fallback(z.string(), "").default(""),
  sub: fallback(z.string(), "").default(""),
  q: fallback(z.string(), "").default(""),
  sort: fallback(z.enum(SORTS), "type").default("type"),
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
  loader: () => getCollectionCatalog(),
  errorComponent: ({ error }) => <ErrorComponent error={error} />,
  notFoundComponent: () => <div className="p-12">Not found</div>,
  component: CollectionPage,
});

function CollectionPage() {
  const { products, facets, total } = Route.useLoaderData();
  const { category, sub, q, sort } = Route.useSearch();
  const navigate = useNavigate({ from: "/collection" });

  // Default category: "lounge" if available; otherwise leave empty (= All)
  useEffect(() => {
    if (!category && facets.some((f) => f.slug === "lounge")) {
      navigate({
        search: (prev) => ({ ...prev, category: "lounge" }),
        replace: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search box
  const [qLocal, setQLocal] = useState(q);
  useEffect(() => setQLocal(q), [q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (qLocal !== q) {
        navigate({
          search: (prev) => ({ ...prev, q: qLocal, sub: "" }),
          replace: true,
        });
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qLocal]);

  // Subcategory facets for the active category
  const subcategoryFacets = useMemo(() => {
    if (!category) return [] as { label: string; count: number }[];
    const m = new Map<string, number>();
    for (const p of products) {
      if (p.categorySlug !== category || !p.subcategory) continue;
      m.set(p.subcategory, (m.get(p.subcategory) ?? 0) + 1);
    }
    return [...m.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [products, category]);

  // Filter + sort
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    let list = products.filter((p) => {
      if (category && p.categorySlug !== category) return false;
      if (sub && p.subcategory !== sub) return false;
      if (query) {
        const t = p.title.toLowerCase();
        if (!t.includes(query)) return false;
      }
      return true;
    });

    if (query) {
      // exact > starts-with > contains
      const rank = (p: CollectionProduct) => {
        const t = p.title.toLowerCase();
        if (t === query) return 0;
        if (t.startsWith(query)) return 1;
        return 2;
      };
      list = [...list].sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title));
    } else {
      switch (sort) {
        case "az":
          list = [...list].sort((a, b) => a.title.localeCompare(b.title));
          break;
        case "newest":
          list = [...list].sort((a, b) => a.scrapedOrder - b.scrapedOrder);
          break;
        case "oldest":
          list = [...list].sort((a, b) => b.scrapedOrder - a.scrapedOrder);
          break;
        case "type":
        default: {
          const orderIdx = new Map<string, number>(
            CATEGORY_DISPLAY_ORDER.map((d, i) => [d, i] as const),
          );
          list = [...list].sort(
            (a, b) =>
              (orderIdx.get(a.displayCategory) ?? 999) -
                (orderIdx.get(b.displayCategory) ?? 999) ||
              a.title.localeCompare(b.title),
          );
        }
      }
    }
    return list;
  }, [products, category, sub, q, sort]);

  // Quick view
  const [quickViewId, setQuickViewId] = useState<string | null>(null);
  const quickViewIndex = useMemo(
    () => (quickViewId ? filtered.findIndex((p) => p.id === quickViewId) : -1),
    [filtered, quickViewId],
  );
  const quickViewProduct = quickViewIndex >= 0 ? filtered[quickViewIndex] : null;

  // Body scroll lock when Quick View open
  useEffect(() => {
    if (!quickViewProduct) return;
    document.body.style.overflow = "hidden";
    return () => document.body.style.removeProperty("overflow");
  }, [quickViewProduct]);

  const hasActiveFilters = !!(category || sub || q);
  const resetAll = () => {
    setQLocal("");
    navigate({
      search: () => ({ category: "", sub: "", q: "", sort: "type" }),
      replace: true,
    });
  };

  return (
    <main className="min-h-screen bg-cream text-charcoal pb-32">
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
            A working rental inventory of furniture, lighting, tableware, and bespoke pieces. Browse
            by category, search by name, then add favorites to an inquiry.
          </p>
        </div>
      </section>

      {/* Sticky filter header */}
      <div className="sticky top-0 z-30 bg-cream/95 backdrop-blur-sm border-y border-charcoal/10">
        {/* Category row */}
        <div className="px-6 lg:px-12 border-b border-charcoal/10">
          <div className="max-w-7xl mx-auto flex gap-1 overflow-x-auto py-3 -mx-6 lg:-mx-12 px-6 lg:px-12 no-scrollbar">
            <CategoryPill
              label={`All (${total})`}
              active={!category}
              onClick={() =>
                navigate({
                  search: (prev) => ({ ...prev, category: "", sub: "" }),
                  replace: true,
                })
              }
            />
            {facets.map((f) => (
              <CategoryPill
                key={f.slug}
                label={`${f.display} (${f.count})`}
                active={category === f.slug}
                onClick={() =>
                  navigate({
                    search: (prev) => ({ ...prev, category: f.slug, sub: "" }),
                    replace: true,
                  })
                }
              />
            ))}
          </div>
        </div>

        {/* Subcategory + controls row */}
        <div className="px-6 lg:px-12">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 py-3">
            <div className="flex gap-1 overflow-x-auto no-scrollbar -mx-6 lg:mx-0 px-6 lg:px-0">
              {subcategoryFacets.length > 0 && (
                <>
                  <SubPill
                    label="All"
                    active={!sub}
                    onClick={() =>
                      navigate({
                        search: (prev) => ({ ...prev, sub: "" }),
                        replace: true,
                      })
                    }
                  />
                  {subcategoryFacets.map((s) => (
                    <SubPill
                      key={s.label}
                      label={`${s.label} (${s.count})`}
                      active={sub === s.label}
                      onClick={() =>
                        navigate({
                          search: (prev) => ({ ...prev, sub: s.label }),
                          replace: true,
                        })
                      }
                    />
                  ))}
                </>
              )}
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <input
                type="text"
                inputMode="search"
                placeholder="Search pieces…"
                value={qLocal}
                onChange={(e) => setQLocal(e.target.value)}
                className="h-9 w-full lg:w-56 bg-transparent border border-charcoal/15 px-3 text-sm placeholder:text-charcoal/40 focus:outline-none focus:border-charcoal/50"
              />
              <select
                value={sort}
                onChange={(e) =>
                  navigate({
                    search: (prev) => ({ ...prev, sort: e.target.value as SortKey }),
                    replace: true,
                  })
                }
                className="h-9 bg-transparent border border-charcoal/15 px-2 text-sm text-charcoal focus:outline-none focus:border-charcoal/50"
              >
                <option value="type">By Type</option>
                <option value="az">A–Z</option>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>
          </div>
        </div>

        {/* Count row */}
        <div className="px-6 lg:px-12 border-t border-charcoal/10">
          <div className="max-w-7xl mx-auto flex items-center justify-between py-2.5">
            <p className="text-xs uppercase tracking-[0.2em] text-charcoal/60">
              {q.trim()
                ? `${filtered.length} ${filtered.length === 1 ? "piece" : "pieces"} matching “${q.trim()}”`
                : `${filtered.length} ${filtered.length === 1 ? "piece" : "pieces"}`}
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetAll}
                className="text-xs uppercase tracking-[0.2em] text-charcoal/60 hover:text-charcoal transition-colors"
              >
                Reset all
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid */}
      <section className="px-6 lg:px-12 pt-8">
        <div className="max-w-7xl mx-auto">
          {filtered.length === 0 ? (
            <div className="py-32 text-center">
              <p className="font-display text-3xl">No pieces found</p>
              <p className="mt-3 text-charcoal/60">Try adjusting your filters.</p>
              <button
                onClick={resetAll}
                className="mt-6 text-xs uppercase tracking-[0.2em] underline underline-offset-4 hover:text-charcoal/70"
              >
                Reset all filters
              </button>
            </div>
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 lg:gap-4">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} onOpen={() => setQuickViewId(p.id)} />
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Quick View modal */}
      {quickViewProduct && (
        <QuickView
          product={quickViewProduct}
          hasPrev={quickViewIndex > 0}
          hasNext={quickViewIndex < filtered.length - 1}
          onPrev={() => setQuickViewId(filtered[quickViewIndex - 1]?.id ?? null)}
          onNext={() => setQuickViewId(filtered[quickViewIndex + 1]?.id ?? null)}
          onClose={() => setQuickViewId(null)}
        />
      )}

      {/* Inquiry tray */}
      <InquiryTray />
    </main>
  );
}

/* -------------------- bits -------------------- */

function CategoryPill({
  label, active, onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "whitespace-nowrap text-xs uppercase tracking-[0.18em] px-3 py-2 transition-colors border",
        active
          ? "bg-charcoal text-cream border-charcoal"
          : "bg-transparent text-charcoal/70 border-transparent hover:text-charcoal",
      )}
    >
      {label}
    </button>
  );
}

function SubPill({
  label, active, onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "whitespace-nowrap text-[11px] uppercase tracking-[0.16em] px-3 py-1.5 transition-colors border",
        active
          ? "border-charcoal text-charcoal"
          : "border-charcoal/15 text-charcoal/55 hover:border-charcoal/40 hover:text-charcoal",
      )}
    >
      {label}
    </button>
  );
}

function ProductCard({
  product, onOpen,
}: {
  product: CollectionProduct;
  onOpen: () => void;
}) {
  return (
    <li>
      <button
        onClick={onOpen}
        className="group block w-full text-left bg-white border border-charcoal/8 hover:border-charcoal/20 transition-colors"
      >
        <div className="relative aspect-square overflow-hidden bg-white">
          {product.primaryImage ? (
            <img
              src={product.primaryImage.url}
              alt={product.primaryImage.altText ?? product.title}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-charcoal/30 text-xs">
              No image
            </div>
          )}

          {/* Hover overlay clipping up from bottom */}
          <div className="absolute inset-x-0 bottom-0 bg-charcoal/85 text-cream px-3 py-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <p className="text-xs leading-snug line-clamp-2">{product.title}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-cream/70">
              Quick View
            </p>
          </div>
        </div>
      </button>
    </li>
  );
}

function QuickView({
  product, hasPrev, hasNext, onPrev, onNext, onClose,
}: {
  product: CollectionProduct;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const [imgIdx, setImgIdx] = useState(0);
  const inquiry = useInquiry();
  const inInquiry = inquiry.has(product.id);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Reset image when product changes
  useEffect(() => setImgIdx(0), [product.id]);

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && hasPrev) onPrev();
      else if (e.key === "ArrowRight" && hasNext) onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasPrev, hasNext, onPrev, onNext, onClose]);

  useEffect(() => {
    closeRef.current?.focus();
  }, [product.id]);

  const img = product.images[imgIdx] ?? product.primaryImage;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={product.title}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6"
    >
      <div
        className="absolute inset-0 bg-charcoal/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full md:max-w-5xl bg-cream text-charcoal shadow-xl max-h-[92vh] md:max-h-[85vh] overflow-auto">
        {/* Close + nav */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-cream/95 backdrop-blur border-b border-charcoal/10">
          <p className="text-[10px] uppercase tracking-[0.25em] text-charcoal/55">
            {product.displayCategory}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              aria-label="Previous piece"
              className="h-8 px-3 text-xs uppercase tracking-[0.2em] disabled:opacity-30 hover:text-charcoal/60"
            >
              ‹ Prev
            </button>
            <button
              onClick={onNext}
              disabled={!hasNext}
              aria-label="Next piece"
              className="h-8 px-3 text-xs uppercase tracking-[0.2em] disabled:opacity-30 hover:text-charcoal/60"
            >
              Next ›
            </button>
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Close"
              className="h-8 w-8 grid place-items-center text-lg hover:text-charcoal/60"
            >
              ×
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-0">
          {/* Image gallery */}
          <div className="bg-white">
            <div className="relative aspect-square">
              {img ? (
                <img
                  src={img.url}
                  alt={img.altText ?? product.title}
                  className="absolute inset-0 w-full h-full object-contain p-6"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-charcoal/30">
                  No image
                </div>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto border-t border-charcoal/10">
                {product.images.map((im, i) => (
                  <button
                    key={im.url}
                    onClick={() => setImgIdx(i)}
                    className={cn(
                      "relative h-16 w-16 flex-shrink-0 bg-white border transition-colors",
                      i === imgIdx
                        ? "border-charcoal"
                        : "border-charcoal/10 hover:border-charcoal/40",
                    )}
                  >
                    <img
                      src={im.url}
                      alt=""
                      className="absolute inset-0 w-full h-full object-contain p-1"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detail */}
          <div className="p-6 lg:p-8 flex flex-col">
            <h2 className="font-display text-3xl leading-tight">{product.title}</h2>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-charcoal/55">
              {product.displayCategory}
              {product.subcategory ? ` · ${product.subcategory}` : ""}
            </p>

            <dl className="mt-6 space-y-3 text-sm">
              {product.dimensions && (
                <Row label="Dimensions" value={product.dimensions} />
              )}
              {product.stockedQuantity && (
                <Row label="Stocked" value={product.stockedQuantity} />
              )}
              {product.isCustomOrder && (
                <Row label="Availability" value="Custom order" />
              )}
            </dl>

            {product.description && (
              <p className="mt-6 text-sm leading-relaxed text-charcoal/75 whitespace-pre-line">
                {product.description}
              </p>
            )}

            <div className="mt-auto pt-8 flex flex-wrap gap-3">
              <button
                onClick={() => inquiry.toggle(product.id)}
                className={cn(
                  "px-5 py-3 text-xs uppercase tracking-[0.22em] transition-colors border",
                  inInquiry
                    ? "bg-cream text-charcoal border-charcoal"
                    : "bg-charcoal text-cream border-charcoal hover:bg-charcoal/85",
                )}
              >
                {inInquiry ? "Added to inquiry" : "Add to Inquiry"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 border-b border-charcoal/8 pb-2">
      <dt className="w-28 flex-shrink-0 text-[10px] uppercase tracking-[0.22em] text-charcoal/55 pt-1">
        {label}
      </dt>
      <dd className="text-sm text-charcoal">{value}</dd>
    </div>
  );
}

function InquiryTray() {
  const { ids, count, clear } = useInquiry();
  if (count === 0) return null;
  const href = `/contact?items=${ids.join(",")}#inquiry`;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-charcoal text-cream shadow-2xl">
      <div className="flex items-center gap-4 px-5 py-3">
        <span className="text-xs uppercase tracking-[0.22em]">
          Inquiry · {count} {count === 1 ? "piece" : "pieces"}
        </span>
        <button
          onClick={clear}
          className="text-[10px] uppercase tracking-[0.22em] text-cream/60 hover:text-cream"
        >
          Clear
        </button>
        <Link
          to="/contact"
          search={{ items: ids.join(",") } as never}
          hash="inquiry"
          className="bg-cream text-charcoal px-4 py-2 text-xs uppercase tracking-[0.22em] hover:bg-cream/85 transition-colors"
          // Fallback href in case search/hash isn't typed at root
          href={href}
        >
          Review inquiry
        </Link>
      </div>
    </div>
  );
}
