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
// card_background_url, cover_focal_x/y, upscaled_cover_url) into a single
// JSON blob at squarespace-mirror/catalog/overlay.json. The public catalog
// reads that blob in one request instead of paginating inventory_items on
// every visit. Admins click Publish when a batch of photo/order edits is
// ready to go live.
// ---------------------------------------------------------------------------

export const publishCatalogOverlay = createServerFn({ method: "POST" })
  .middleware([requireStaffOrAdmin])
  .handler(async ({ context }) => {
    const PAGE = 1000;
    const overlay: Record<
      string,
      {
        editorial_order: number | null;
        images: string[] | null;
        card_background_url: string | null;
        cover_focal_x: number | null;
        cover_focal_y: number | null;
        upscaled_cover_url: string | null;
      }
    > = {};

    let from = 0;
    for (;;) {
      const { data, error } = await supabaseAdmin
        .from("inventory_items")
        .select(
          "rms_id, editorial_order, images, card_background_url, cover_focal_x, cover_focal_y, upscaled_cover_url",
        )
        .range(from, from + PAGE - 1);
      if (error) throw new Error(`PUBLISH_READ_FAILED: ${error.message}`);
      if (!data || data.length === 0) break;
      for (const row of data as Array<{ rms_id: string | null } & (typeof overlay)[string]>) {
        if (!row.rms_id) continue;
        overlay[row.rms_id] = {
          editorial_order: row.editorial_order,
          images: row.images,
          card_background_url: row.card_background_url,
          cover_focal_x: row.cover_focal_x,
          cover_focal_y: row.cover_focal_y,
          upscaled_cover_url: row.upscaled_cover_url,
        };
      }
      if (data.length < PAGE) break;
      from += PAGE;
    }

    const publishedAt = new Date().toISOString();
    const payload = JSON.stringify({ publishedAt, count: Object.keys(overlay).length, overlay });
    const blob = new Blob([payload], { type: "application/json" });

    const { error: upErr } = await supabaseAdmin.storage
      .from("squarespace-mirror")
      .upload("catalog/overlay.json", blob, {
        upsert: true,
        contentType: "application/json",
        cacheControl: "60",
      });
    if (upErr) throw new Error(`PUBLISH_WRITE_FAILED: ${upErr.message}`);

    // Gallery orders — snapshot admin-curated plate order per gallery so
    // /gallery serves the same one-request static blob instead of hitting
    // Supabase live. Baked JSON remains the ultimate fallback; this
    // snapshot beats a full rebake by moments when admins reorder.
    let galleryCount = 0;
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
      const { error: gUpErr } = await supabaseAdmin.storage
        .from("squarespace-mirror")
        .upload("catalog/gallery-orders.json", gBlob, {
          upsert: true,
          contentType: "application/json",
          cacheControl: "60",
        });
      if (gUpErr) throw gUpErr;
    } catch (e) {
      // Non-fatal — inventory overlay already published. Log and continue.
      console.warn("[publish] gallery-orders snapshot failed:", e);
    }

    void audit({
      actorId: context.userId,
      entity: "catalog_overlay",
      entityId: "catalog/overlay.json",
      action: "publish",
      metadata: { count: Object.keys(overlay).length, galleryCount, publishedAt },
    });

    return { ok: true, publishedAt, count: Object.keys(overlay).length, galleryCount };
  });
