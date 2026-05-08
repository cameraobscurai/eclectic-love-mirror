// Admin server functions for the /admin/colors QA grid.
// Gated by requireAdmin (Supabase bearer token + has_role('admin')).
// Service-role client is used inside handlers for catalog reads/writes.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";

export interface ColorRow {
  rms_id: string;
  slug: string;
  title: string;
  category: string | null;
  hero: string | null;
  color_hex: string | null;
  color_hex_secondary: string | null;
  color_lightness: number | null;
  color_hue: number | null;
  color_chroma: number | null;
  color_family: string | null;
  color_temperature: string | null;
  color_confidence: number | null;
  color_source: string | null;
  color_tagged_at: string | null;
  color_locked: boolean;
  color_needs_review: boolean;
  color_notes: string | null;
}

export interface ColorListResponse {
  rows: ColorRow[];
  total: number;
  tagged: number;
  needsReview: number;
  locked: number;
  untagged: number;
}

export const listColorRows = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((d) =>
    z
      .object({
        filter: z
          .enum(["all", "needs_review", "untagged", "low_confidence", "locked"])
          .optional(),
        family: z.string().optional(),
        category: z.string().optional(),
        limit: z.number().int().positive().max(2000).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }): Promise<ColorListResponse> => {
    let q = supabaseAdmin
      .from("inventory_items")
      .select(
        "rms_id, slug, title, category, images, color_hex, color_hex_secondary, color_lightness, color_hue, color_chroma, color_family, color_temperature, color_confidence, color_source, color_tagged_at, color_locked, color_needs_review, color_notes",
      )
      .neq("status", "draft")
      .order("title");
    if (data.category) q = q.eq("category", data.category);
    if (data.family) q = q.eq("color_family", data.family);
    if (data.filter === "needs_review") q = q.eq("color_needs_review", true);
    if (data.filter === "untagged") q = q.is("color_tagged_at", null);
    if (data.filter === "low_confidence") q = q.lt("color_confidence", 0.6);
    if (data.filter === "locked") q = q.eq("color_locked", true);
    if (data.limit) q = q.limit(data.limit);
    const { data: rows, error } = await q;
    if (error) throw error;
    const out: ColorRow[] = (rows ?? []).map((r: Record<string, unknown>) => ({
      rms_id: String(r.rms_id),
      slug: String(r.slug),
      title: String(r.title),
      category: (r.category as string) ?? null,
      hero: Array.isArray(r.images) && r.images.length > 0 ? String((r.images as string[])[0]) : null,
      color_hex: (r.color_hex as string) ?? null,
      color_hex_secondary: (r.color_hex_secondary as string) ?? null,
      color_lightness: r.color_lightness != null ? Number(r.color_lightness) : null,
      color_hue: r.color_hue != null ? Number(r.color_hue) : null,
      color_chroma: r.color_chroma != null ? Number(r.color_chroma) : null,
      color_family: (r.color_family as string) ?? null,
      color_temperature: (r.color_temperature as string) ?? null,
      color_confidence: r.color_confidence != null ? Number(r.color_confidence) : null,
      color_source: (r.color_source as string) ?? null,
      color_tagged_at: (r.color_tagged_at as string) ?? null,
      color_locked: !!r.color_locked,
      color_needs_review: !!r.color_needs_review,
      color_notes: (r.color_notes as string) ?? null,
    }));
    // Aggregates over the full set (ignore filters for the summary card so
    // numbers stay stable as the user filters).
    const { data: agg, error: aggErr } = await supabaseAdmin
      .from("inventory_items")
      .select("color_tagged_at, color_locked, color_needs_review", { count: "exact" })
      .neq("status", "draft");
    if (aggErr) throw aggErr;
    const list = agg ?? [];
    return {
      rows: out,
      total: list.length,
      tagged: list.filter((r) => r.color_tagged_at != null).length,
      needsReview: list.filter((r) => r.color_needs_review).length,
      locked: list.filter((r) => r.color_locked).length,
      untagged: list.filter((r) => r.color_tagged_at == null).length,
    };
  });

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const FAMILIES = [
  "black","charcoal","grey","brown","tan","cream","white",
  "red","orange","yellow","green","blue","purple","pink",
  "metallic-warm","metallic-cool","multi",
] as const;

// CIELAB conversion duplicated server-side so we can compute lightness/hue
// from a manual hex override without trusting client math.
function srgbToLinear(c: number) { c /= 255; return c <= 0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); }
function rgbToLab(r: number, g: number, b: number) {
  const R = srgbToLinear(r), G = srgbToLinear(g), B = srgbToLinear(b);
  const X = (R*0.4124 + G*0.3576 + B*0.1805) / 0.95047;
  const Y = (R*0.2126 + G*0.7152 + B*0.0722) / 1.00000;
  const Z = (R*0.0193 + G*0.1192 + B*0.9505) / 1.08883;
  const f = (t: number) => t > 0.008856 ? Math.cbrt(t) : 7.787*t + 16/116;
  const fx = f(X), fy = f(Y), fz = f(Z);
  return [116*fy - 16, 500*(fx-fy), 200*(fy-fz)] as const;
}

export const overrideColor = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        rms_id: z.string().min(1),
        hex: z.string().regex(HEX_RE),
        family: z.enum(FAMILIES),
        temperature: z.enum(["warm", "neutral", "cool"]).optional(),
        notes: z.string().max(500).optional(),
        lock: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const r = parseInt(data.hex.slice(1, 3), 16);
    const g = parseInt(data.hex.slice(3, 5), 16);
    const b = parseInt(data.hex.slice(5, 7), 16);
    const [L, a, bb] = rgbToLab(r, g, b);
    const C = Math.sqrt(a * a + bb * bb);
    let H = (Math.atan2(bb, a) * 180) / Math.PI;
    if (H < 0) H += 360;
    const { error } = await supabaseAdmin
      .from("inventory_items")
      .update({
        color_hex: data.hex,
        color_lightness: Number(L.toFixed(2)),
        color_chroma: Number(C.toFixed(2)),
        color_hue: C < 8 ? null : Number(H.toFixed(2)),
        color_family: data.family,
        color_temperature: data.temperature ?? null,
        color_confidence: 1,
        color_source: "manual",
        color_locked: data.lock ?? true,
        color_needs_review: false,
        color_notes: data.notes ?? null,
        color_tagged_at: new Date().toISOString(),
      })
      .eq("rms_id", data.rms_id);
    if (error) throw error;
    return { ok: true };
  });

export const setColorLocked = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ rms_id: z.string().min(1), locked: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("inventory_items")
      .update({ color_locked: data.locked })
      .eq("rms_id", data.rms_id);
    if (error) throw error;
    return { ok: true };
  });

export const clearColorTag = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ rms_id: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("inventory_items")
      .update({
        color_hex: null,
        color_hex_secondary: null,
        color_lightness: null,
        color_hue: null,
        color_chroma: null,
        color_family: null,
        color_temperature: null,
        color_confidence: null,
        color_source: null,
        color_needs_review: false,
        color_tagged_at: null,
      })
      .eq("rms_id", data.rms_id)
      .eq("color_locked", false);
    if (error) throw error;
    return { ok: true };
  });
