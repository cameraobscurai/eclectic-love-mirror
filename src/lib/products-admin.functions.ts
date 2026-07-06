// Server functions for /admin/products — staff-or-admin editable.
// Audit log entries are written automatically by the inventory_items_audit trigger.

import { createServerFn } from "@tanstack/react-start";
import { requireStaffOrAdmin } from "@/integrations/supabase/admin-middleware";

const EDITABLE_FIELDS = [
  "title", "slug", "description", "price", "status", "category",
  "width_cm", "height_cm", "depth_cm", "weight_kg", "materials", "origin",
  "images", "meta_title", "meta_description", "og_image",
  "quantity", "quantity_label", "dimensions_raw",
  "public_ready", "hidden_note", "manual_injection",
  "editorial_order", "manual_order",
  "card_background_url", "upscaled_cover_url",
  "cover_focal_x", "cover_focal_y",
] as const;

type EditableField = typeof EDITABLE_FIELDS[number];
type PatchInput = Partial<Record<EditableField, unknown>>;

export const listProducts = createServerFn({ method: "POST" })
  .middleware([requireStaffOrAdmin])
  .inputValidator((d: {
    search?: string;
    category?: string;
    publicReady?: "yes" | "no" | "all";
    limit?: number;
    offset?: number;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const limit = Math.min(data.limit ?? 50, 200);
    const offset = data.offset ?? 0;

    let q = supabase
      .from("inventory_items")
      .select("id, rms_id, title, slug, category, status, quantity, quantity_label, public_ready, images, upscaled_cover_url, updated_at, editorial_order", { count: "exact" })
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (data.search?.trim()) {
      const s = data.search.trim();
      q = q.or(`title.ilike.%${s}%,rms_id.ilike.%${s}%,slug.ilike.%${s}%`);
    }
    if (data.category) q = q.eq("category", data.category);
    if (data.publicReady === "yes") q = q.eq("public_ready", true);
    if (data.publicReady === "no") q = q.eq("public_ready", false);

    const { data: rows, count, error } = await q;
    if (error) throw new Response(error.message, { status: 500 });

    return { rows: rows ?? [], count: count ?? 0, limit, offset };
  });

export const getProduct = createServerFn({ method: "POST" })
  .middleware([requireStaffOrAdmin])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("inventory_items")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Response(error.message, { status: 500 });
    if (!row) throw new Response("Not found", { status: 404 });
    return row;
  });

export const updateProduct = createServerFn({ method: "POST" })
  .middleware([requireStaffOrAdmin])
  .inputValidator((d: { id: string; patch: PatchInput }) => d)
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    for (const k of EDITABLE_FIELDS) {
      if (k in data.patch) patch[k] = data.patch[k];
    }
    if (Object.keys(patch).length === 0) {
      throw new Response("No editable fields in patch", { status: 400 });
    }

    const { data: row, error } = await context.supabase
      .from("inventory_items")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(patch as any)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Response(error.message, { status: 500 });
    return row;
  });

export const listDistinctCategories = createServerFn({ method: "POST" })
  .middleware([requireStaffOrAdmin])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("inventory_items")
      .select("category")
      .not("category", "is", null);
    if (error) throw new Response(error.message, { status: 500 });
    const set = new Set<string>();
    for (const r of data ?? []) if (r.category) set.add(r.category);
    return Array.from(set).sort();
  });

export const listProductAudit = createServerFn({ method: "POST" })
  .middleware([requireStaffOrAdmin])
  .inputValidator((d: { entityId: string; limit?: number }) => d)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("admin_audit_log")
      .select("id, at, actor_id, action, before, after, metadata")
      .eq("entity", "inventory_items")
      .eq("entity_id", data.entityId)
      .order("at", { ascending: false })
      .limit(Math.min(data.limit ?? 20, 100));
    if (error) throw new Response(error.message, { status: 500 });
    return rows ?? [];
  });
