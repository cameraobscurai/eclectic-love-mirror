// Server functions for /admin/products — staff-or-admin editable.
// Audit log entries are written automatically by the inventory_items_audit trigger.

import { createServerFn } from "@tanstack/react-start";
import { requireStaffOrAdmin } from "@/integrations/supabase/admin-middleware";

// Staff can edit merchandising/inventory fields; admin adds URL + SEO + injection.
// rms_id is in NEITHER list — set by import, never editable via drawer.
const STAFF_EDITABLE_FIELDS = [
  "title", "description", "price", "status", "category", "subcategory_slug",
  "width_cm", "height_cm", "depth_cm", "weight_kg", "materials", "origin",
  "images",
  "quantity", "quantity_label", "dimensions_raw",
  "public_ready", "hidden_note",
  "editorial_order", "manual_order",
  // upscaled_cover_url is RETIRED — the AI upscaler baked opaque backdrops and
  // invented shadows into cutout photos. Nothing reads it; nothing may write it.
  "card_background_url",

  "cover_focal_x", "cover_focal_y",
] as const;

const ADMIN_ONLY_FIELDS = [
  "slug", "meta_title", "meta_description", "og_image", "manual_injection",
] as const;

const EDITABLE_FIELDS = [...STAFF_EDITABLE_FIELDS, ...ADMIN_ONLY_FIELDS] as const;

type EditableField = typeof EDITABLE_FIELDS[number];
type PatchInput = Partial<Record<EditableField, unknown>>;

// PostgREST .or() treats `,` `.` `(` `)` as syntax tokens for unquoted values.
// The correct injection-safe pattern is to wrap the value in double quotes and
// escape embedded `"` and `\` — inside quoted values the delimiters are
// literal. Backslash-escaping the delimiters on a bare value does NOT work
// (the parser still splits on the literal `,`/`)`).
function quotePostgrestFilterValue(raw: string): string {
  return `"${raw.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export const listProducts = createServerFn({ method: "POST" })
  .middleware([requireStaffOrAdmin])
  .inputValidator((d: {
    search?: string;
    /** DECLARED taxonomy (Adrienne's vocabulary): inventory_items.collection_slug */
    collection?: string;
    /** DECLARED taxonomy: inventory_items.category_slug */
    categorySlug?: string;
    /** Legacy free-text `category` column — retained for old links only. */
    category?: string;
    subcategory?: string;
    publicReady?: "yes" | "no" | "all";
    rmsIds?: string[];
    sort?: "title" | "collection" | "category" | "updated";
    limit?: number;
    offset?: number;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const limit = Math.min(data.limit ?? 50, 200);
    const offset = data.offset ?? 0;

    // Group filter passed empty set → no matches, short-circuit.
    if (data.rmsIds && data.rmsIds.length === 0) {
      return { rows: [], count: 0, limit, offset };
    }

    let q = supabase
      .from("inventory_items")
      .select("id, rms_id, title, slug, category, subcategory_slug, collection_slug, category_slug, status, quantity, quantity_label, public_ready, images, updated_at, editorial_order", { count: "exact" });

    // Sort is explicit and STABLE. Default is alphabetical by title so the
    // list never reshuffles just because a row was touched — editing a piece
    // used to float it to the top under the old updated_at ordering.
    // Collection / Category sort the DECLARED columns, not the legacy ones.
    switch (data.sort ?? "title") {
      case "collection":
        q = q.order("collection_slug", { ascending: true, nullsFirst: false })
             .order("category_slug", { ascending: true, nullsFirst: false })
             .order("title", { ascending: true });
        break;
      case "category":
        q = q.order("category_slug", { ascending: true, nullsFirst: false })
             .order("title", { ascending: true });
        break;
      case "updated":
        q = q.order("updated_at", { ascending: false }).order("rms_id", { ascending: true });
        break;
      default:
        q = q.order("title", { ascending: true }).order("rms_id", { ascending: true });
    }
    q = q.range(offset, offset + limit - 1);

    if (data.search?.trim()) {
      const s = quotePostgrestFilterValue(`%${data.search.trim()}%`);
      q = q.or(`title.ilike.${s},rms_id.ilike.${s},slug.ilike.${s}`);
    }
    if (data.collection) q = q.eq("collection_slug", data.collection);
    if (data.categorySlug) q = q.eq("category_slug", data.categorySlug);
    if (data.category) q = q.eq("category", data.category);
    if (data.subcategory) q = q.eq("subcategory_slug", data.subcategory);
    if (data.publicReady === "yes") q = q.eq("public_ready", true);
    if (data.publicReady === "no") q = q.eq("public_ready", false);
    if (data.rmsIds && data.rmsIds.length > 0) q = q.in("rms_id", data.rmsIds);

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
    const role = (context as { role?: "admin" | "staff" | "user" }).role ?? "staff";
    const allowed = role === "admin"
      ? new Set<string>([...STAFF_EDITABLE_FIELDS, ...ADMIN_ONLY_FIELDS])
      : new Set<string>(STAFF_EDITABLE_FIELDS);

    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data.patch)) {
      if (allowed.has(k)) patch[k] = v;
    }
    if (Object.keys(patch).length === 0) {
      throw new Response("No editable fields in patch", { status: 400 });
    }

    // Server-side validation mirror for numeric fields.
    if ("price" in patch && patch.price != null) {
      const p = Number(patch.price);
      if (!Number.isFinite(p) || p < 0) {
        throw new Response("Price must be a non-negative number.", { status: 400 });
      }
      patch.price = p;
    }
    if ("quantity" in patch && patch.quantity != null) {
      const q = Number(patch.quantity);
      if (!Number.isFinite(q) || q < 0 || !Number.isInteger(q)) {
        throw new Response("Quantity must be a non-negative whole number.", { status: 400 });
      }
      patch.quantity = q;
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

export const getMyRole = createServerFn({ method: "POST" })
  .middleware([requireStaffOrAdmin])
  .handler(async ({ context }) => {
    const role = (context as { role?: "admin" | "staff" | "user" }).role ?? "staff";
    return { role };
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

// Hard-delete a single inventory row. Staff + admin (RLS: "Staff can delete
// items"). Single-row only, always confirmed in the UI — never bulk.
export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireStaffOrAdmin])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error: readErr } = await supabase
      .from("inventory_items")
      .select("id, title, rms_id")
      .eq("id", data.id)
      .maybeSingle();
    if (readErr) throw new Response(readErr.message, { status: 500 });
    if (!row) throw new Response("That piece no longer exists.", { status: 404 });

    const { error } = await supabase.from("inventory_items").delete().eq("id", data.id);
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true, id: data.id, title: row.title as string };
  });
