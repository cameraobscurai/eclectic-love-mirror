// PDP loader data, resolved on the server.
//
// Why a server function and not a plain loader call: route loaders are
// isomorphic. A client-side navigation from /collection into a PDP runs the
// loader in the browser, which imports the 1.1MB `current_catalog.json` chunk
// just to find one product. Routing the lookup through an RPC keeps that chunk
// out of the navigation path entirely — the browser receives one product.
//
// The related rails still need the catalog, but they load it themselves after
// mount, below the fold (see RelatedPieces).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getCollectionCatalog, type CollectionProduct } from "@/lib/phase3-catalog";

const slugInput = z.object({ slug: z.string().min(1).max(200) });

/** One product by slug (or id). Returns null rather than throwing so the
 *  route owns the notFound() decision. */
export const getPdpProduct = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => slugInput.parse(d))
  .handler(async ({ data }): Promise<CollectionProduct | null> => {
    const catalog = await getCollectionCatalog();
    return (
      catalog.products.find((p) => p.slug === data.slug) ??
      catalog.products.find((p) => p.id === data.slug) ??
      null
    );
  });

/** First imaged product in a parent collection — the og:image fallback for
 *  category landings that have no hand-picked hero. */
export const getParentFallbackImage = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => slugInput.parse(d))
  .handler(async ({ data }): Promise<string | null> => {
    const catalog = await getCollectionCatalog();
    const firstImaged = catalog.products.find(
      (p) => p.collectionSlug === data.slug && p.primaryImage?.url,
    );
    return firstImaged?.primaryImage?.url ?? null;
  });
