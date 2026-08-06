// ---------------------------------------------------------------------------
// useOrderedGalleryProjects
//
// Single source of truth for the gallery list as the public site sees it:
// static project content + admin plate-order overrides (baked snapshot as the
// guaranteed floor, live published snapshot layered on when available).
//
// Shared by /gallery and /gallery/$slug so both render identical plate order.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import { galleryProjects, type GalleryProject } from "@/content/gallery-projects";
import { applyGalleryOrder, gallerySlug } from "@/lib/gallery-orders";
import bakedGalleryOrders from "@/data/gallery/gallery-orders.json";

const MISSING_KEY = "eh:gallery-orders-missing";

export function useOrderedGalleryProjects(): GalleryProject[] {
  const [liveOrders, setLiveOrders] = useState<Record<string, string[]> | null>(null);

  useEffect(() => {
    let alive = true;
    const base = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
      ?.VITE_SUPABASE_URL;
    if (!base) return;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(MISSING_KEY) === "1") {
      return;
    }
    (async () => {
      try {
        const manRes = await fetch(
          `${base}/storage/v1/object/public/squarespace-mirror/catalog/manifest.json?t=${Math.floor(Date.now() / 60000)}`,
          { cache: "no-cache" },
        );
        if (!manRes.ok) {
          if (typeof sessionStorage !== "undefined") sessionStorage.setItem(MISSING_KEY, "1");
          return;
        }
        const manifest = (await manRes.json()) as { galleryOrdersKey?: string | null };
        if (!manifest.galleryOrdersKey) return;
        const res = await fetch(
          `${base}/storage/v1/object/public/squarespace-mirror/${manifest.galleryOrdersKey}`,
          { cache: "force-cache" },
        );
        if (!res.ok) return;
        const payload = (await res.json()) as { orders?: Record<string, string[]> } | null;
        if (!alive || !payload?.orders) return;
        setLiveOrders(payload.orders);
      } catch {
        /* baked fallback covers us */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return useMemo<GalleryProject[]>(() => {
    const src =
      liveOrders ??
      ((bakedGalleryOrders as { orders?: Record<string, string[]> }).orders ?? {});
    const orders = new Map<string, string[]>();
    for (const [slug, keys] of Object.entries(src)) {
      if (Array.isArray(keys) && keys.length > 0) orders.set(slug, keys);
    }
    if (orders.size === 0) return galleryProjects;
    return galleryProjects.map((p) => {
      const keys = orders.get(gallerySlug(p));
      if (!keys) return p;
      return {
        ...p,
        detailImages: applyGalleryOrder(p.detailImages, {
          gallery_slug: gallerySlug(p),
          order_keys: keys,
        }),
      };
    });
  }, [liveOrders]);
}
