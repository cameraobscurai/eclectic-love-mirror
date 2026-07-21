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
import { getCollectionCatalog, type CollectionProduct } from "@/lib/phase3-catalog";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import {
  PARENT_LABELS,
  isParentId,
  type ParentId,
} from "@/lib/collection-parents";
import { CATEGORY_COVERS, coverUrl } from "@/lib/category-covers";
import type { BrowseGroupId } from "@/lib/collection-browse-groups";
import { RelatedPieces } from "@/components/collection/RelatedPieces";
import { ProductStage } from "@/components/pdp/ProductStage";

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
  "furs-pelts": null,
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
    "Pillows and throws — texture for lounges, ceremony seating, and styled corners. From Eclectic Hive's curated event rental archive.",
  rugs:
    "Vintage and contemporary rugs for ceremony aisles, lounge floors, and outdoor installations. Eclectic Hive's rug program for event rental.",
  styling:
    "Accents, crates, baskets, and styling props. The detail layer for editorial event design — by Eclectic Hive.",
  "large-decor":
    "Structures, walls, and oversized installations. Eclectic Hive's large-format pieces for event design across Colorado and the Mountain West.",
  "furs-pelts":
    "Hides, furs, and pelts — textural layers for lounges and ceremony seating. From Eclectic Hive's curated archive.",
};

function absoluteCover(parent: ParentId): string | null {
  const group = PARENT_HERO_GROUP[parent];
  if (!group) return null;
  const url = coverUrl(CATEGORY_COVERS[group]);
  if (!url) return null;
  return url.startsWith("http") ? url : `${SITE}${url}`;
}

type ParentLoad = { kind: "parent"; parent: ParentId; fallbackImage: string | null };
type ProductLoad = { kind: "product"; product: CollectionProduct };
type LoadResult = ParentLoad | ProductLoad;

export const Route = createFileRoute("/collection_/$slug")({
  loader: async ({ params }): Promise<LoadResult> => {
    if (isParentId(params.slug)) {
      const parent = params.slug as ParentId;
      let fallbackImage: string | null = null;
      if (!PARENT_HERO_GROUP[parent]) {
        const catalog = await getCollectionCatalog();
        const firstImaged = catalog.products.find(
          (p) => p.categorySlug === parent && p.primaryImage?.url,
        );
        fallbackImage = firstImaged?.primaryImage?.url ?? null;
      }
      return { kind: "parent", parent, fallbackImage };
    }
    const catalog = await getCollectionCatalog();
    const product =
      catalog.products.find((p) => p.slug === params.slug) ??
      catalog.products.find((p) => p.id === params.slug) ??
      null;
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
      const img =
        absoluteCover(parent) ??
        toAbsolute(data.fallbackImage) ??
        COLLECTION_DEFAULT_OG;
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
        links: [{ rel: "canonical", href: url }],
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
        meta: [
          { title: "Not Found — Eclectic Hive" },
          { name: "robots", content: "noindex" },
        ],
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
    jsonLd.offers = {
      "@type": "Offer",
      availability: "https://schema.org/InStock",
      priceCurrency: "USD",
      price: "0",
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
        <h1 className="font-display text-3xl tracking-wide uppercase mb-4">
          Piece Not Found
        </h1>
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
      <Footer />
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
        <h1 className="font-display text-4xl lg:text-5xl tracking-wide uppercase mb-6">
          {label}
        </h1>
        <p className="text-sm leading-relaxed text-foreground/80 max-w-2xl mx-auto mb-10">
          {desc}
        </p>
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
      <Footer />
    </div>
  );
}

function ProductDetailPage({ product }: { product: CollectionProduct }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <main className="mx-auto max-w-7xl px-6 lg:px-12 pt-28 pb-24">
        <nav className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-10">
          <Link to="/collection" className="hover:text-foreground transition-colors">
            Collection
          </Link>
          <span className="mx-2 opacity-50">/</span>
          <Link
            to="/collection"
            search={{ group: product.categorySlug }}
            className="hover:text-foreground transition-colors"
          >
            {product.displayCategory}
          </Link>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-start">
          {/* Editorial stage — resolution-safe primary + secondary grid. */}
          <div className="lg:col-span-7">
            <ProductStage product={product} />
          </div>

          {/* Meta column — sticky spec sheet. */}
          <div className="lg:col-span-5 lg:sticky lg:top-28">
            <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-6">
              {product.displayCategory}
            </p>
            <h1 className="font-display text-4xl md:text-5xl tracking-wide uppercase leading-[1.1] mb-10">
              {product.title}
            </h1>

            <div className="border-t border-foreground/10 pt-10 space-y-10">
              <div className="grid grid-cols-2 gap-6">
                {product.dimensions && (
                  <div>
                    <span className="block text-[9px] tracking-[0.25em] uppercase text-muted-foreground mb-2">
                      Dimensions
                    </span>
                    <p className="text-sm leading-relaxed">{product.dimensions}</p>
                  </div>
                )}
                {(product.stockedQuantity || product.isCustomOrder) && (
                  <div>
                    <span className="block text-[9px] tracking-[0.25em] uppercase text-muted-foreground mb-2">
                      Availability
                    </span>
                    <p className="text-sm leading-relaxed">
                      {product.isCustomOrder
                        ? "Made to order"
                        : product.stockedQuantity}
                    </p>
                  </div>
                )}
              </div>

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

            <div className="mt-14">
              <Link
                to="/contact"
                className="block w-full text-center bg-foreground text-background py-5 text-[11px] tracking-[0.35em] uppercase hover:bg-foreground/85 transition-colors"
              >
                Inquire About This Piece
              </Link>
            </div>
          </div>
        </div>


        <RelatedPieces product={product} />
      </main>
      <Footer />
    </div>
  );
}
