// Admin photo manager server functions.
// Gated by requireAdmin. Three surfaces:
//   - reorderItems: bulk-update editorial_order for tiles in one category.
//   - listStorageFiles: browse the squarespace-mirror bucket so admins can
//     attach an existing image without re-uploading.
//   - listCategoryItems: hydrate the admin grid from live DB (not the baked
//     catalog), so reorders show instantly without waiting for a rebake.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireStaffOrAdmin } from "@/integrations/supabase/admin-middleware";
import { audit } from "@/server/_audit.server";

// ---------------------------------------------------------------------------
// Reorder
// ---------------------------------------------------------------------------

const reorderInput = z.object({
  category: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  ids: z.array(z.string().min(1).max(64)).min(1).max(500),
});

export const reorderItems = createServerFn({ method: "POST" })
  .middleware([requireStaffOrAdmin])
  .inputValidator((d: unknown) => reorderInput.parse(d))
  .handler(async ({ data, context }) => {
    // Admin drag-order is the single source of truth for site display order.
    // Writes editorial_order (gaps of 10 leave room for cheap mid-insert).
    //
    // Atomic via a Postgres RPC (public.reorder_inventory_items) — a single
    // UPDATE ... FROM jsonb_array_elements runs in one transaction, so a
    // partial failure can't leave editorial_order half-written.
    const { error } = await supabaseAdmin.rpc("reorder_inventory_items", {
      p_updates: data.ids.map((rmsId, i) => ({
        rms_id: rmsId,
        editorial_order: (i + 1) * 10,
      })),
    });

    if (error) {
      console.error("[reorderItems] RPC failed:", error);
      throw new Error(`REORDER_FAILED: ${error.message}`);
    }

    void audit({
      actorId: context.userId,
      entity: "inventory_items",
      entityId: data.category,
      action: "reorder_category",
      metadata: { category: data.category, count: data.ids.length },
    });

    return { ok: true, count: data.ids.length, savedAt: Date.now() };
  });

// ---------------------------------------------------------------------------
// Storage browser — list files in squarespace-mirror under a prefix.
// ---------------------------------------------------------------------------

const listFilesInput = z.object({
  rmsId: z.string().min(1).max(64).regex(/^[a-zA-Z0-9._-]+$/).nullable(),
  limit: z.number().int().min(1).max(200).default(60),
  search: z.string().max(120).optional(),
});

export const listStorageFiles = createServerFn({ method: "POST" })
  .middleware([requireStaffOrAdmin])
  .inputValidator((d: unknown) => listFilesInput.parse(d))
  .handler(async ({ data }) => {
    const bucket = supabaseAdmin.storage.from("squarespace-mirror");

    // 1. Item-scoped folder first — these are the photos most likely wanted.
    const itemFiles: Array<{ url: string; name: string; updatedAt: string | null }> = [];
    if (data.rmsId) {
      const prefix = `inventory/${data.rmsId}`;
      const { data: rows, error } = await bucket.list(prefix, {
        limit: data.limit,
        sortBy: { column: "updated_at", order: "desc" },
      });
      if (error) throw error;
      for (const row of rows ?? []) {
        if (!row.name || row.name.endsWith("/")) continue;
        if (data.search && !row.name.toLowerCase().includes(data.search.toLowerCase())) continue;
        const path = `${prefix}/${row.name}`;
        const { data: pub } = bucket.getPublicUrl(path);
        itemFiles.push({ url: pub.publicUrl, name: row.name, updatedAt: row.updated_at });
      }
    }

    // 2. Recent across whole inventory folder (last N folders, 5 each).
    const recent: Array<{ url: string; name: string; folder: string; updatedAt: string | null }> = [];
    const { data: folders } = await bucket.list("inventory", {
      limit: 40,
      sortBy: { column: "updated_at", order: "desc" },
    });
    for (const folder of folders ?? []) {
      if (!folder.name || folder.name === data.rmsId) continue;
      const { data: rows } = await bucket.list(`inventory/${folder.name}`, {
        limit: 5,
        sortBy: { column: "updated_at", order: "desc" },
      });
      for (const r of rows ?? []) {
        if (!r.name || r.name.endsWith("/")) continue;
        if (data.search && !r.name.toLowerCase().includes(data.search.toLowerCase())) continue;
        const path = `inventory/${folder.name}/${r.name}`;
        const { data: pub } = bucket.getPublicUrl(path);
        recent.push({ url: pub.publicUrl, name: r.name, folder: folder.name, updatedAt: r.updated_at });
        if (recent.length >= data.limit) break;
      }
      if (recent.length >= data.limit) break;
    }

    return { itemFiles, recent };
  });

// ---------------------------------------------------------------------------
// Live category items for the admin grid.
// ---------------------------------------------------------------------------

const listCategoryInput = z.object({
  category: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
});

export const listCategoryItems = createServerFn({ method: "POST" })
  .middleware([requireStaffOrAdmin])
  .inputValidator((d: unknown) => listCategoryInput.parse(d))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("inventory_items")
      .select(
        "id, rms_id, title, slug, category, images, card_background_url, editorial_order, owner_site_rank, public_ready, updated_at",
      )
      .eq("category", data.category)
      .neq("status", "draft")
      .neq("public_ready", false);

    if (error) throw error;

    const sorted = (rows ?? []).slice().sort((a, b) => {
      // Mirror the write column from reorderItems. Falls back to the
      // owner-site rank for categories that haven't been editorial-ranked yet.
      const am = a.editorial_order ?? a.owner_site_rank ?? 9e9;
      const bm = b.editorial_order ?? b.owner_site_rank ?? 9e9;
      if (am !== bm) return am - bm;
      return (a.title ?? "").localeCompare(b.title ?? "");
    });

    return { items: sorted };
  });

// ---------------------------------------------------------------------------
// Publish — materialize the live overlay (editorial_order, images,
// card_background_url, cover_focal_x/y) into a single
// JSON blob at squarespace-mirror/catalog/overlay.json. The public catalog
// reads that blob in one request instead of paginating inventory_items on
// every visit. Admins click Publish when a batch of photo/order edits is
// ready to go live.
// ---------------------------------------------------------------------------

export const publishCatalogOverlay = createServerFn({ method: "POST" })
  .middleware([requireStaffOrAdmin])
  .handler(async ({ context }) => {
    const PAGE = 1000;
    // Identity fields (title/slug/category/…) ride along so the public
    // catalog can render products that were added AFTER the last bake.
    // Without them a brand-new product stays invisible until someone runs
    // scripts/bake-catalog.mjs — which Adrienne cannot do.
    const overlay: Record<
      string,
      {
        editorial_order: number | null;
        images: string[] | null;
        card_background_url: string | null;
        cover_focal_x: number | null;
        cover_focal_y: number | null;
        title: string | null;
        slug: string | null;
        category: string | null;
        description: string | null;
        dimensions_raw: string | null;
        quantity: number | null;
        quantity_label: string | null;
        public_ready: boolean | null;
        subcategory_slug: string | null;
        cover_framed_url: string | null;
        collection_slug: string | null;
        category_slug: string | null;
        /** Pinned variant photo (inventory_items.variant_cover_url) and the
         *  configurator label. Null = AUTO, i.e. today's convention. */
        variant_cover_url: string | null;
        variant_label: string | null;
        /** Epoch seconds of the row's last edit. Drives the public `?v=`
         *  cache-buster so a re-uploaded photo at the SAME storage URL cannot
         *  serve stale CDN bytes. Without it the buster stayed frozen at the
         *  last bake. */
        images_version: number | null;
      }
    > = {};

    let from = 0;
    for (;;) {
      const { data, error } = await supabaseAdmin
        .from("inventory_items")
        .select(
          "rms_id, editorial_order, images, card_background_url, cover_focal_x, cover_focal_y, title, slug, category, description, dimensions_raw, quantity, quantity_label, public_ready, subcategory_slug, cover_framed_url, collection_slug, category_slug, variant_cover_url, variant_label, updated_at",
        )
        .range(from, from + PAGE - 1);
      if (error) throw new Error(`PUBLISH_READ_FAILED: ${error.message}`);
      if (!data || data.length === 0) break;
      for (const row of data as Array<
        { rms_id: string | null; updated_at?: string | null } & (typeof overlay)[string]
      >) {
        if (!row.rms_id) continue;
        overlay[row.rms_id] = {
          editorial_order: row.editorial_order,
          images: row.images,
          card_background_url: row.card_background_url,
          cover_focal_x: row.cover_focal_x,
          cover_focal_y: row.cover_focal_y,
          title: row.title,
          slug: row.slug,
          category: row.category,
          description: row.description ? row.description.slice(0, 500) : null,
          dimensions_raw: row.dimensions_raw,
          quantity: row.quantity ?? null,
          quantity_label: row.quantity_label,
          public_ready: row.public_ready,
          subcategory_slug: row.subcategory_slug ?? null,
          cover_framed_url: row.cover_framed_url ?? null,
          collection_slug: row.collection_slug ?? null,
          category_slug: row.category_slug ?? null,
          images_version: row.updated_at
            ? Math.floor(new Date(row.updated_at).getTime() / 1000)
            : null,
        };
      }
      if (data.length < PAGE) break;
      from += PAGE;
    }


    // Suppress-list. Deletion is invisible to the walk above (a deleted row
    // just stops being mentioned), so its baked tile would survive on the
    // live site until the next bake. `deleted_items` carries it across.
    // Purged at bake time — see scripts/bake-catalog.mjs.
    const deleted: string[] = [];
    {
      const { data: tombs, error: tErr } = await supabaseAdmin
        .from("deleted_items")
        .select("rms_id, item_id");
      if (tErr) throw new Error(`PUBLISH_TOMBSTONE_READ_FAILED: ${tErr.message}`);
      for (const t of (tombs ?? []) as Array<{ rms_id: string | null; item_id: string }>) {
        if (t.rms_id) deleted.push(t.rms_id);
        deleted.push(t.item_id);
      }
    }

    const publishedAt = new Date().toISOString();
    const stamp = publishedAt.replace(/[:.]/g, "-");
    const payload = JSON.stringify({
      publishedAt,
      count: Object.keys(overlay).length,
      overlay,
      deleted,
    });
    const blob = new Blob([payload], { type: "application/json" });


    // Immutable, timestamped key — never overwritten, so concurrent readers
    // never see a torn write. Manifest below is the sole mutable pointer.
    const overlayKey = `catalog/overlay-${stamp}.json`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("squarespace-mirror")
      .upload(overlayKey, blob, {
        upsert: false,
        contentType: "application/json",
        cacheControl: "31536000, immutable",
      });
    if (upErr) throw new Error(`PUBLISH_WRITE_FAILED: ${upErr.message}`);

    // Gallery orders — snapshot admin-curated plate order per gallery so
    // /gallery serves the same one-request static blob instead of hitting
    // Supabase live. Baked JSON remains the ultimate fallback.
    let galleryCount = 0;
    let galleryOrdersKey: string | null = null;
    try {
      const { data: gRows, error: gErr } = await supabaseAdmin
        .from("gallery_orders")
        .select("gallery_slug, order_keys");
      if (gErr) throw gErr;
      const orders: Record<string, string[]> = {};
      for (const row of (gRows ?? []) as Array<{
        gallery_slug: string | null;
        order_keys: string[] | null;
      }>) {
        if (row.gallery_slug && Array.isArray(row.order_keys) && row.order_keys.length > 0) {
          orders[row.gallery_slug] = row.order_keys;
        }
      }
      galleryCount = Object.keys(orders).length;
      const gPayload = JSON.stringify({ publishedAt, count: galleryCount, orders });
      const gBlob = new Blob([gPayload], { type: "application/json" });
      const key = `catalog/gallery-orders-${stamp}.json`;
      const { error: gUpErr } = await supabaseAdmin.storage
        .from("squarespace-mirror")
        .upload(key, gBlob, {
          upsert: false,
          contentType: "application/json",
          cacheControl: "31536000, immutable",
        });
      if (gUpErr) throw gUpErr;
      galleryOrdersKey = key;
    } catch (e) {
      // Non-fatal — inventory overlay already published. Log and continue.
      console.warn("[publish] gallery-orders snapshot failed:", e);
    }

    // Single small atomic write — the only mutable pointer readers consult.
    // Publish becomes visible at this instant; the immutable blobs above are
    // already durable.
    const manifest = { publishedAt, overlayKey, galleryOrdersKey };
    const { error: manErr } = await supabaseAdmin.storage
      .from("squarespace-mirror")
      .upload(
        "catalog/manifest.json",
        new Blob([JSON.stringify(manifest)], { type: "application/json" }),
        { upsert: true, contentType: "application/json", cacheControl: "60" },
      );
    if (manErr) throw new Error(`PUBLISH_MANIFEST_FAILED: ${manErr.message}`);

    void audit({
      actorId: context.userId,
      entity: "catalog_overlay",
      entityId: overlayKey,
      action: "publish",
      metadata: { count: Object.keys(overlay).length, galleryCount, publishedAt },
    });

    return { ok: true, publishedAt, count: Object.keys(overlay).length, galleryCount };
  });

// ---------------------------------------------------------------------------
// getPublishStatus — "does the live site match the database?"
//
// Every admin edit writes straight to inventory_items, but the public catalog
// reads the last published snapshot. Before this, nothing on screen said so:
// an owner would change a photo, see it in the admin, not see it live, and
// report that the site had "reverted". It never reverted — it was never
// published. This powers the pending bar in AdminShell.
// ---------------------------------------------------------------------------
export const getPublishStatus = createServerFn({ method: "GET" })
  .middleware([requireStaffOrAdmin])
  .handler(async () => {
    let publishedAt: string | null = null;
    try {
      const { data } = await supabaseAdmin.storage
        .from("squarespace-mirror")
        .download("catalog/manifest.json");
      if (data) {
        const parsed = JSON.parse(await data.text()) as { publishedAt?: string };
        publishedAt = parsed.publishedAt ?? null;
      }
    } catch {
      publishedAt = null;
    }

    if (!publishedAt) return { publishedAt: null, pending: 0 };

    const { count, error } = await supabaseAdmin
      .from("inventory_items")
      .select("id", { count: "exact", head: true })
      .gt("updated_at", publishedAt);
    if (error) return { publishedAt, pending: 0 };

    // Deletions are pending work too. Without this a delete looks done in the
    // admin while the live ghost waits for a publish nobody knows to click.
    const { count: tombCount } = await supabaseAdmin
      .from("deleted_items")
      .select("id", { count: "exact", head: true })
      .gt("deleted_at", publishedAt);

    return { publishedAt, pending: (count ?? 0) + (tombCount ?? 0) };

  });
