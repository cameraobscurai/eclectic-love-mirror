// Standalone product detail route at /collection/<slug>.
// Sibling of /collection (note the trailing underscore on the filename so
// this is NOT a child layout of collection.tsx — it does not touch or
// re-render the 900-tile grid).
//
// Purpose: give every product a real canonical URL with its own title,
// description, og:image, and Product JSON-LD. The existing
// /collection?view=<slug> modal flow is unaffected.

import { createFileRoute, Link, notFound, ErrorComponent } from "@tanstack/react-router";
import { getCollectionCatalog, type CollectionProduct } from "@/lib/phase3-catalog";
import Header from "@/components/header";
import Footer from "@/components/footer";

const SITE = "https://eclectichive.com";

function productUrl(slug: string) {
  return `${SITE}/collection/${slug}`;
}

export const Route = createFileRoute("/collection_/$slug")({
  loader: async ({ params }) => {
    const catalog = await getCollectionCatalog();
    const product =
      catalog.products.find((p) => p.slug === params.slug) ??
      catalog.products.find((p) => p.id === params.slug) ??
      null;
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData, params }) => {
    const product = loaderData?.product as CollectionProduct | undefined;
    const slug = params.slug;
    if (!product) {
      return {
        meta: [
          { title: "Product Not Found — Eclectic Hive" },
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
    <div className="min-h-screen bg-background">
      <Header />
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
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { product } = Route.useLoaderData();
  const img = product.primaryImage?.url;
  const alt = product.primaryImage?.altText || product.title;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-6 lg:px-12 pt-28 pb-24">
        <nav className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-8">
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

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          <div className="aspect-[4/5] bg-muted/30 flex items-center justify-center overflow-hidden">
            {img ? (
              <img
                src={img}
                alt={alt}
                className="w-full h-full object-contain"
                loading="eager"
                decoding="async"
              />
            ) : (
              <div className="text-xs tracking-widest uppercase text-muted-foreground">
                No image
              </div>
            )}
          </div>

          <div className="lg:sticky lg:top-28">
            <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-4">
              {product.displayCategory}
            </p>
            <h1 className="font-display text-3xl lg:text-4xl tracking-wide uppercase mb-6">
              {product.title}
            </h1>

            {product.description && (
              <p className="text-sm leading-relaxed text-foreground/80 mb-8 whitespace-pre-line">
                {product.description}
              </p>
            )}

            <dl className="space-y-4 border-t border-foreground/10 pt-6 mb-10">
              {product.dimensions && (
                <div>
                  <dt className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-1">
                    Dimensions
                  </dt>
                  <dd className="text-sm">{product.dimensions}</dd>
                </div>
              )}
              {product.stockedQuantity && (
                <div>
                  <dt className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-1">
                    Available
                  </dt>
                  <dd className="text-sm">{product.stockedQuantity}</dd>
                </div>
              )}
              {product.isCustomOrder && (
                <div>
                  <dt className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-1">
                    Custom Order
                  </dt>
                  <dd className="text-sm">Made to order — lead time on request.</dd>
                </div>
              )}
            </dl>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/contact"
                className="inline-block text-center border border-foreground bg-foreground text-background px-8 py-4 text-[11px] tracking-[0.25em] uppercase hover:bg-transparent hover:text-foreground transition-colors"
              >
                Inquire About This Piece
              </Link>
              <Link
                to="/collection"
                search={{ view: product.slug }}
                className="inline-block text-center border border-foreground/40 px-8 py-4 text-[11px] tracking-[0.25em] uppercase hover:bg-foreground hover:text-background transition-colors"
              >
                View in Collection
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
