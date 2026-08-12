// Frame Studio — Task 1.3 save path, completed at 2.2 with the recipe hash.
//
// The renderer runs where sharp runs (batch script / node), never here: this
// function receives finished bytes and the recipe that produced them, hashes
// the recipe (not the placement — Phase 2 amendment 1), uploads both sizes at
// the hashed path, and points the row at the 1200w URL.
//
// R1: a published URL never receives new bytes. The hash covers every
// pixel-determining input, so a path collision means an identical composition
// — a 409 is dedup success, never an error, never an upsert.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireStaffOrAdmin } from "@/integrations/supabase/admin-middleware";
import { audit } from "@/server/_audit.server";
import { framedHash16, framedCoverPath } from "@/lib/frame-hash";
import { RULE_VERSION, CANVAS_W, CANVAS_H, type FrameRecipe } from "@/lib/frame-engine";

const placementSchema = z.object({
  scale: z.number().finite(),
  offsetX: z.number().finite(),
  offsetY: z.number().finite(),
});

// Absent keys stay absent — `.optional()`, never `.nullable()`. Nulling would
// change the canonical string and therefore the hash.
const recipeSchema = z.object({
  crop: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }).optional(),
  rotate: z.number().finite().optional(),
  bg: z.string().max(64).optional(),
  shadow: z
    .object({ opacity: z.number(), blur: z.number(), offsetY: z.number() })
    .optional(),
  normalize: z.boolean().optional(),
  placement: placementSchema,
});

const saveInput = z.object({
  id: z.string().uuid(),
  srcUrl: z.string().url().max(2000),
  srcHash: z.string().regex(/^[0-9a-f]{16,64}$/),
  recipe: recipeSchema,
  base64_1200: z.string().min(1),
  base64_600: z.string().min(1),
  method: z.enum(["auto-alpha", "auto-color", "manual"]),
  bboxPx: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
  advisories: z.array(z.string()).max(10).default([]),
  approved: z.boolean().default(true),
});

const MAX_DECODED = 10 * 1024 * 1024;

const decode = (b64: string): Uint8Array => {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  if (bytes.byteLength > MAX_DECODED) throw new Error("File exceeds 10MB limit");
  return bytes;
};

export const saveFramedCover = createServerFn({ method: "POST" })
  .middleware([requireStaffOrAdmin])
  .inputValidator((d: unknown) => saveInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error: readErr } = await supabaseAdmin
      .from("inventory_items")
      .select("id, rms_id, cover_framed_url, cover_framed_meta")
      .eq("id", data.id)
      .single();
    if (readErr || !row) throw new Error("NOT_FOUND: item missing");

    const recipe = data.recipe as FrameRecipe;
    const hash16 = await framedHash16(data.srcHash, recipe, RULE_VERSION);
    const folder = row.rms_id || row.id;

    const bucket = supabaseAdmin.storage.from("squarespace-mirror");
    const sizes = [
      { w: 1200, bytes: decode(data.base64_1200) },
      { w: 600, bytes: decode(data.base64_600) },
    ];

    let deduped = 0;
    const paths: Record<number, string> = {};
    for (const s of sizes) {
      const path = framedCoverPath(folder, hash16, s.w);
      paths[s.w] = path;
      const { error: upErr } = await bucket.upload(path, s.bytes, {
        contentType: "image/webp",
        upsert: false,
        cacheControl: "31536000",
      });
      if (upErr) {
        const msg = upErr.message?.toLowerCase() ?? "";
        if (msg.includes("already exists") || msg.includes("duplicate")) deduped++;
        else throw upErr;
      }
    }

    const { data: pub } = bucket.getPublicUrl(paths[1200]!);
    const publicUrl = pub.publicUrl;

    const meta = {
      srcUrl: data.srcUrl,
      srcHash: data.srcHash,
      hash16,
      recipe,
      bboxPx: data.bboxPx ?? null,
      method: data.method,
      canvas: [CANVAS_W, CANVAS_H],
      approved: data.approved,
      ruleVersion: RULE_VERSION,
      generatedAt: new Date().toISOString(),
      advisories: data.advisories,
    };

    const { error: updErr } = await supabaseAdmin
      .from("inventory_items")
      .update({
        cover_framed_url: publicUrl,
        cover_framed_meta: meta as unknown as never,
      })
      .eq("id", data.id);
    if (updErr) throw updErr;

    void audit({
      actorId: context.userId,
      entity: "inventory_items",
      entityId: data.id,
      action: deduped === sizes.length ? "save_framed_cover_deduped" : "save_framed_cover",
      metadata: {
        bucket: "squarespace-mirror",
        hash16,
        ruleVersion: RULE_VERSION,
        paths: Object.values(paths),
        bytes: { w1200: sizes[0]!.bytes.byteLength, w600: sizes[1]!.bytes.byteLength },
        deduped,
        previousUrl: row.cover_framed_url ?? null,
      },
    });

    return { ok: true, url: publicUrl, hash16, deduped: deduped === sizes.length, meta };
  });

/** Count of live rows still rendering through the legacy solver (amendment 5). */
export const getFallbackCount = createServerFn({ method: "GET" })
  .middleware([requireStaffOrAdmin])
  .handler(async () => {
    const total = await supabaseAdmin
      .from("inventory_items")
      .select("id", { count: "exact", head: true })
      .eq("public_ready", true);
    const framed = await supabaseAdmin
      .from("inventory_items")
      .select("id", { count: "exact", head: true })
      .eq("public_ready", true)
      .not("cover_framed_url", "is", null);
    const t = total.count ?? 0;
    const f = framed.count ?? 0;
    return { total: t, framed: f, legacy: Math.max(0, t - f) };
  });
