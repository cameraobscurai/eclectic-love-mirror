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
