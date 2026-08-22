// Standalone detail/landing route at /collection/<slug>.
//
// Two kinds of slug live at this URL pattern:
//   1. ParentId (e.g. "lounge-seating", "tableware")   → category landing
//   2. product slug or id                              → product detail
//
// Sibling of /collection (trailing underscore in the filename keeps this
// out of collection.tsx's layout subtree, so the 900-tile grid never
// re-mounts when a detail/landing page is opened).
//
// Why parents land here too: the audit called out that the archive lived
// behind a single canonical URL (/collection?group=...) with no per-category
// share preview. Routing each parent to /collection/<parent> with its own
// head() gives Google + social platforms a real page to attribute the
// category title, description, and editorial cover image to. The page
// itself client-side-navigates back into the archive with the parent
// pre-applied, so the existing UX is untouched.

import { useEffect } from "react";
import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
  ErrorComponent,
} from "@tanstack/react-router";
import { type CollectionProduct } from "@/lib/phase3-catalog";
import { getPdpProduct, getParentFallbackImage } from "@/lib/pdp.functions";
import { Navigation } from "@/components/navigation";
import {
  PARENT_LABELS,
  PARENT_SUBS,
  isParentId,
  productParent,
  productCategory,
  type ParentId,
} from "@/lib/collection-parents";
import { CATEGORY_COVERS, coverUrl } from "@/lib/category-covers";
import type { BrowseGroupId } from "@/lib/collection-browse-groups";
import { RelatedPieces } from "@/components/collection/RelatedPieces";
import { ProductStage } from "@/components/pdp/ProductStage";
import { ShareButton } from "@/components/pdp/ShareButton";
import { ScaleRuleWidth, ScaleRuleHeight } from "@/components/collection/ScaleRule";
import { parseDimensionsInches } from "@/components/collection/productPhysicalScale";
import { useInquiry } from "@/hooks/use-inquiry";

import {
  VariantConfigurator,
  configurableVariants,
  resolveVariant,
  variantKey,
} from "@/components/pdp/VariantConfigurator";

const SITE = "https://eclectichive.com";

// Sitewide fallback share image for collection overviews — matches the
// og:image on /collection so no parent overview ever emits nothing.
const COLLECTION_DEFAULT_OG =
  "https://wdyfavzfquegrxklcpmq.supabase.co/storage/v1/object/public/squarespace-mirror/inventory/3146/f0aaf4ee6c705ee2.png";

function toAbsolute(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${SITE}${url.startsWith("/") ? "" : "/"}${url}`;
}

function productUrl(slug: string) {
  return `${SITE}/collection/${slug}`;
}
function parentUrl(parent: ParentId) {
  return `${SITE}/collection/${parent}`;
}

// Representative cover per parent (cover map is keyed by BrowseGroupId).
// Parents without an editorial cover fall back to the default /og/collection
// preview rather than emitting no og:image.
const PARENT_HERO_GROUP: Record<ParentId, BrowseGroupId | null> = {
  "lounge-seating": "sofas",
  "lounge-tables": "coffee-tables",
  "cocktail-bar": "bar",
  dining: "dining",
  tableware: "tableware",
  lighting: "lighting",
  textiles: "pillows",
  rugs: "rugs",
  styling: "styling",
  "large-decor": null,
};

const PARENT_DESCRIPTIONS: Record<ParentId, string> = {
  "lounge-seating":
    "Sofas, lounge chairs, benches, and ottomans for event lounges in Denver and the Mountain West. From Eclectic Hive's curated rental archive.",
  "lounge-tables":
    "Coffee tables, side tables, and consoles for lounge vignettes — sourced and styled by Eclectic Hive for events across Colorado.",
  "cocktail-bar":
    "Cocktail tables, back-bars, and bar-height stools for receptions and after-parties. Eclectic Hive's bar program, available for rental in Denver and the Mountain West.",
  dining:
    "Dining tables and chairs from Eclectic Hive — seating plans for plated dinners, family-style suppers, and editorial tablescapes.",
  tableware:
    "Dinnerware, flatware, glassware, and serveware. Eclectic Hive's tabletop archive for event rental in Denver and beyond.",
  lighting:
    "Candlelight, chandeliers, lamps, and specialty lighting from Eclectic Hive's rental archive. Built for ambient, editorial events.",
  textiles:
    "Pillows, throws, and hides — texture for lounges, ceremony seating, and styled corners. From Eclectic Hive's curated event rental archive.",
  rugs: "Vintage and contemporary rugs for ceremony aisles, lounge floors, and outdoor installations. Eclectic Hive's rug program for event rental.",
  styling:
    "Accents, crates, baskets, and styling props. The detail layer for editorial event design — by Eclectic Hive.",
  "large-decor":
    "Structures, walls, and oversized installations. Eclectic Hive's large-format pieces for event design across Colorado and the Mountain West.",
};

function absoluteCover(parent: ParentId): string | null {
  const group = PARENT_HERO_GROUP[parent];
  if (!group) return null;
  const url = coverUrl(CATEGORY_COVERS[group]);
  if (!url) return null;
  return url.startsWith("http") ? url : `${SITE}${url}`;
}

type ParentLoad = { kind: "parent"; parent: ParentId; fallbackImage: string | null };
// Deliberately does NOT carry the catalog. Everything the PDP needs beyond
// this one product (the related rails, prev/next) is derived client-side from
// the shared catalog chunk — see RelatedPieces. Returning `allProducts` here
// serialized ~950KB of JSON into every product page's HTML.
type ProductLoad = {
  kind: "product";
  product: CollectionProduct;
};
type LoadResult = ParentLoad | ProductLoad;

export const Route = createFileRoute("/collection_/$slug")({
  // `?v=` is the configurator selection. Unknown values fall back to the
  // family lead rather than erroring, so an old link never 404s.
  validateSearch: (search: Record<string, unknown>): { v?: string } => {
    const v = typeof search.v === "string" ? search.v.slice(0, 80) : undefined;
    return v ? { v } : {};
  },
  // The catalog is baked (static JSON) + a live overlay behind a module-level
  // singleton, so once resolved it doesn't change within a session. Skip
  // re-running the loader on client-side nav between PDPs.
  staleTime: Infinity,

  loader: async ({ params }): Promise<LoadResult> => {
    if (isParentId(params.slug)) {
      const parent = params.slug as ParentId;
      const fallbackImage = PARENT_HERO_GROUP[parent]
        ? null
        : await getParentFallbackImage({ data: { slug: parent } });
      return { kind: "parent", parent, fallbackImage };
    }
    const product = await getPdpProduct({ data: { slug: params.slug } });
    if (!product) throw notFound();
    return { kind: "product", product };
  },
  head: ({ loaderData, params }) => {
    const data = loaderData as LoadResult | undefined;
    const slug = params.slug;

    // Category landing page
    if (data?.kind === "parent") {
      const parent = data.parent;
      const label = PARENT_LABELS[parent];
      const desc = PARENT_DESCRIPTIONS[parent];
      const url = parentUrl(parent);
      const img = absoluteCover(parent) ?? toAbsolute(data.fallbackImage) ?? COLLECTION_DEFAULT_OG;
      const title = `${label} — Event Rental Archive | Eclectic Hive`;

      const jsonLd = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: label,
        description: desc,
        url,
        isPartOf: { "@type": "WebSite", name: "Eclectic Hive", url: SITE },
        image: img,
      };

      return {
        meta: [
          { title },
          { name: "description", content: desc },
          { property: "og:title", content: `${label} — Eclectic Hive` },
          { property: "og:description", content: desc },
          { property: "og:url", content: url },
          { property: "og:type", content: "website" },
          { property: "og:image", content: img },
          { name: "twitter:image", content: img },
          { name: "twitter:card", content: "summary_large_image" },
        ],
        links: [
          { rel: "canonical", href: url },
          {
            rel: "preload",
            as: "image",
            href: img,
            fetchPriority: "high" as const,
          },
        ],
        scripts: [
          {
            type: "application/ld+json",
            children: JSON.stringify(jsonLd),
          },
        ],
      };
    }

    // Product detail page
    const product = data?.kind === "product" ? data.product : undefined;
    if (!product) {
      return {
        meta: [{ title: "Not Found — Eclectic Hive" }, { name: "robots", content: "noindex" }],
      };
    }

    const title = `${product.title} — Event Rental | Eclectic Hive`;
    const desc =
      product.description?.trim() ||
      `${product.title} — available for event rental from Eclectic Hive in Denver, Colorado.`;
    const img = product.primaryImage?.url;
    const url = productUrl(slug);

    const jsonLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.title,
      description: desc,
      sku: product.id,
      category: product.displayCategory,
      url,
      brand: { "@type": "Brand", name: "Eclectic Hive" },
    };
    if (img) jsonLd.image = img;
    if (product.dimensions) {
      (jsonLd as { additionalProperty?: unknown }).additionalProperty = [
        { "@type": "PropertyValue", name: "Dimensions", value: product.dimensions },
      ];
    }
    // Rental inventory has no list price and no purchasable stock. Emitting
    // price:"0" + InStock made rich results advertise free products, so the
    // offer now carries a quote-only PriceSpecification and no fake price.
    jsonLd.offers = {
      "@type": "Offer",
      availability: product.isCustomOrder
        ? "https://schema.org/PreOrder"
        : "https://schema.org/LimitedAvailability",
      priceCurrency: "USD",
      priceSpecification: {
        "@type": "PriceSpecification",
        priceCurrency: "USD",
        description: "Rental — pricing on request",
      },
      url,
      seller: { "@type": "Organization", name: "Eclectic Hive" },
    };

    return {
      meta: [
        { title },
        { name: "description", content: desc.slice(0, 300) },
        { property: "og:title", content: product.title },
        { property: "og:description", content: desc.slice(0, 300) },
        { property: "og:url", content: url },
        { property: "og:type", content: "product" },
        ...(img
          ? [
              { property: "og:image", content: img },
              { name: "twitter:image", content: img },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(jsonLd),
        },
      ],
    };
  },
  errorComponent: ({ error }) => <ErrorComponent error={error} />,
  notFoundComponent: () => (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <main className="mx-auto max-w-3xl px-6 py-32 text-center">
        <h1 className="font-display text-3xl tracking-wide uppercase mb-4">Piece Not Found</h1>
        <p className="text-sm tracking-widest uppercase text-muted-foreground mb-8">
          This item may have been retired or renamed.
        </p>
        <Link
          to="/collection"
          className="inline-block border border-foreground/40 px-6 py-3 text-xs tracking-[0.2em] uppercase hover:bg-foreground hover:text-background transition-colors"
        >
          Browse the Collection
        </Link>
      </main>
    </div>
  ),
  component: SlugRoutePage,
});

function SlugRoutePage() {
  const data = Route.useLoaderData() as LoadResult;
  if (data.kind === "parent") return <ParentLandingPage parent={data.parent} />;
  return <ProductDetailPage product={data.product} />;
}

// Category landing: SSR emits real h1 + intro copy for crawlers; on mount,
// the client hands off into the existing /collection archive with the
// parent pre-applied so the UX is identical to the legacy URL.
function ParentLandingPage({ parent }: { parent: ParentId }) {
  const navigate = useNavigate();
  const label = PARENT_LABELS[parent];
  const desc = PARENT_DESCRIPTIONS[parent];
  const img = absoluteCover(parent);

  useEffect(() => {
    navigate({
      to: "/collection",
      search: {
        group: parent,
        subcategory: "all",
        q: "",
        sort: "type",
        layout: "grid",
        view: "",
      },
      replace: true,
    });
  }, [navigate, parent]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <main className="mx-auto max-w-4xl px-6 py-32 text-center">
        <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-6">
          The Collection
        </p>
        <h1 className="font-display text-4xl lg:text-5xl tracking-wide uppercase mb-6">{label}</h1>
        <p className="text-sm leading-relaxed text-foreground/80 max-w-2xl mx-auto mb-10">{desc}</p>
        {img && (
          <img
            src={img}
            alt={`${label} — Eclectic Hive`}
            className="w-full max-w-2xl mx-auto h-auto object-contain mb-10"
            loading="eager"
            decoding="async"
          />
        )}
        <Link
          to="/collection"
          search={{ group: parent }}
          className="inline-block border border-foreground/40 px-6 py-3 text-xs tracking-[0.2em] uppercase hover:bg-foreground hover:text-background transition-colors"
        >
          Browse {label}
        </Link>
      </main>
    </div>
  );
}

function ProductDetailPage({ product }: { product: CollectionProduct }) {
  // Breadcrumb reads the DECLARED taxonomy. Unassigned products keep a
  // reachable PDP — they simply lose the category crumb instead of 404ing.
  const parent = productParent(product);
  const category = productCategory(product);
  const categoryLabel = parent
    ? (PARENT_SUBS[parent].find((s) => s.id === category)?.label ?? PARENT_LABELS[parent])
    : null;
  const crumbLabel = categoryLabel ?? product.displayCategory;

  // Configurator: only families with a declared option axis get chips. The
  // selection lives in `?v=` so it survives a share or a reload.
  const navigate = useNavigate();
  const { v } = Route.useSearch();
  const chips = configurableVariants(product);
  const selected = resolveVariant(product, v);

  // Same inquiry tray every other product surface writes to (QuickView,
  // ShopTheLookRail, StudioBrowser, /compose). The PDP used to dead-end at
  // /contact and drop the item id — that was the conversion leak.
  const inquiry = useInquiry();
  const inInquiry = inquiry.has(product.id);

  // Measurement zone: the stage is the largest frame on the site, so it gets
  // the same architectural rules QuickView has had all along.
  const dims = parseDimensionsInches(selected?.dimensions ?? product.dimensions);

  // `stockedQuantity` is a label ("2 available"). Pull the leading count so
  // the rail can show pips without inventing a new field.
  const stockLabel = selected?.stockedQuantity ?? product.stockedQuantity ?? null;
  const stockCount = (() => {
    const m = stockLabel?.match(/(\d+)/);
    const n = m ? Number(m[1]) : NaN;
    return Number.isFinite(n) && n > 0 && n <= 40 ? n : null;
  })();

  const swatches = [product.colorHex, product.colorHexSecondary].filter(
    (h): h is string => typeof h === "string" && /^#[0-9a-f]{3,8}$/i.test(h),
  );
  const colorLine = [product.colorFamily, product.colorTemperature].filter(Boolean).join(" · ");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <main className="mx-auto max-w-7xl px-6 lg:px-12 pt-28 pb-24">
        <nav className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-10 flex items-center gap-4 flex-wrap">
          <button
            type="button"
            onClick={() => {
              // Same-origin history entry → true back-nav preserves the user's
              // scroll position in /collection via TanStack scrollRestoration.
              // Fresh tab / cold deep link → fall back to /collection.
              const cameFromSite =
                typeof document !== "undefined" &&
                document.referrer &&
                new URL(document.referrer).origin === window.location.origin;
              if (cameFromSite && window.history.length > 1) {
                window.history.back();
              } else {
                window.location.href = parent
                  ? `/collection?group=${encodeURIComponent(parent)}${category ? `&subcategory=${encodeURIComponent(category)}` : ""}`
                  : "/collection";
              }
            }}
            className="inline-flex items-center gap-2 hover:text-foreground transition-colors"
            aria-label="Back to collection"
          >
            <span aria-hidden>←</span> Back
          </button>
          <span aria-hidden className="opacity-30">
            |
          </span>
          <Link to="/collection" className="hover:text-foreground transition-colors">
            Collection
          </Link>
          <span className="mx-0 opacity-50">/</span>
          <Link
            to="/collection"
            search={parent ? { group: parent, subcategory: category ?? "all" } : { group: "" }}
            className="hover:text-foreground transition-colors"
          >
            {crumbLabel}
          </Link>
          <span aria-hidden className="opacity-30 ml-auto">
            |
          </span>
          <ShareButton
            title={selected?.title ?? product.title}
            slug={product.slug ?? String(product.id)}
            variantKey={selected ? variantKey(selected) : null}
          />
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-start">
          {/* Editorial stage — resolution-safe primary + secondary grid,
              wrapped in the same architectural rules QuickView uses. */}
          <div className="lg:col-span-7">
            <div className={dims ? "flex items-stretch gap-3" : undefined}>
              {dims && (
                <div className="hidden md:block shrink-0">
                  <ScaleRuleHeight inches={dims.height} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <ProductStage product={product} activeImageUrl={selected?.imageUrl ?? null} />
              </div>
            </div>
            {dims && (
              <div className="mt-4 md:pl-[calc(6px+0.75rem)]">
                <ScaleRuleWidth inches={dims.width} />
              </div>
            )}
          </div>

          {/* Meta column — sticky spec sheet. */}
          <div className="lg:col-span-5 lg:sticky lg:top-28">
            <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-5">
              {crumbLabel}
            </p>
            <h1 className="font-display text-[2.25rem] md:text-[2.6rem] tracking-[0.01em] leading-[1.08] mb-8">
              {selected?.title ?? product.title}
            </h1>

            {chips.length > 1 && product.optionName && (
              <VariantConfigurator
                optionName={product.optionName}
                variants={chips}
                selected={selected}
                onSelect={(v) =>
                  navigate({
                    to: ".",
                    search: { v: variantKey(v) },
                    replace: true,
                    resetScroll: false,
                  })
                }
              />
            )}

            <div className="border-t border-foreground/10 pt-8 space-y-8">
              {/* Specs on one row — no 2-col grid with a hole in it. */}
              <div className="flex flex-wrap items-start gap-x-10 gap-y-6">
                {(selected?.dimensions ?? product.dimensions) && (
                  <div>
                    <span className="block text-[9px] tracking-[0.25em] uppercase text-muted-foreground mb-2">
                      Dimensions
                    </span>
                    <p className="text-sm leading-relaxed tabular-nums">
                      {selected?.dimensions ?? product.dimensions}
                    </p>
                  </div>
                )}
                {(swatches.length > 0 || colorLine) && (
                  <div>
                    <span className="block text-[9px] tracking-[0.25em] uppercase text-muted-foreground mb-2">
                      Palette
                    </span>
                    <div className="flex items-center gap-2">
                      {swatches.map((hex) => (
                        <span
                          key={hex}
                          aria-hidden
                          className="h-4 w-4 rounded-full border border-foreground/15"
                          style={{ background: hex }}
                        />
                      ))}
                      {colorLine && (
                        <span className="text-[10px] tracking-[0.2em] uppercase text-foreground/70">
                          {colorLine}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Archive count — honest about what stock means. No holds, no
                  scheduling system implied. */}
              {(stockCount || stockLabel || product.isCustomOrder) && (
                <div>
                  <span className="block text-[9px] tracking-[0.25em] uppercase text-muted-foreground mb-2">
                    In the archive
                  </span>
                  {product.isCustomOrder ? (
                    <p className="text-sm leading-relaxed">Made to order</p>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        {stockCount && (
                          <span className="flex items-center gap-1" aria-hidden>
                            {Array.from({ length: Math.min(stockCount, 12) }).map((_, i) => (
                              <span key={i} className="h-1.5 w-1.5 rounded-full bg-foreground/70" />
                            ))}
                          </span>
                        )}
                        <span className="text-sm leading-relaxed">{stockLabel}</span>
                      </div>
                      <p className="mt-3 text-xs leading-relaxed text-foreground/60">
                        We confirm what&rsquo;s free for your date when you send the inquiry —
                        nothing here is held until then.
                      </p>
                    </>
                  )}
                </div>
              )}

              {product.description && (
                <div>
                  <span className="block text-[9px] tracking-[0.25em] uppercase text-muted-foreground mb-2">
                    Notes
                  </span>
                  <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/80">
                    {product.description}
                  </p>
                </div>
              )}
            </div>

            {/* Writes to the same tray as every other product surface. */}
            <div className="mt-12 space-y-2">
              <button
                type="button"
                onClick={() => inquiry.toggle(product.id)}
                className={`block w-full text-center py-5 text-[11px] tracking-[0.35em] uppercase border transition-colors ${
                  inInquiry
                    ? "bg-background text-foreground border-foreground"
                    : "bg-foreground text-background border-foreground hover:bg-foreground/85"
                }`}
              >
                {inInquiry ? "Added to inquiry" : "Add to inquiry"}
              </button>
              <Link
                to="/contact"
                className="block w-full text-center py-3 text-[10px] tracking-[0.28em] uppercase text-foreground/70 border border-foreground/20 hover:text-foreground hover:border-foreground/60 transition-colors"
              >
                {inquiry.count > 0 ? `Review inquiry (${inquiry.count})` : "Contact the studio"}
              </Link>
            </div>
          </div>
        </div>

        <RelatedPieces product={product} />
      </main>
    </div>
  );
}
