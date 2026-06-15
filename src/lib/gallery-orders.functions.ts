// Admin server functions for the Gallery reorder tool.
//
// Read is public (the gallery page applies overrides for every visitor); the
// browser client fetches directly via RLS. These server fns own the writes:
// save (upsert) and reset (delete the override row so the manifest default
// returns).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";

const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9-]+$/, "slug must be lowercase letters, digits, hyphens");

const keySchema = z.string().min(1).max(512);

// -------------------------------------------------------------------------
// saveGalleryOrder — upsert the full ordered list for one gallery.
// -------------------------------------------------------------------------
const saveInput = z.object({
  gallery_slug: slugSchema,
  order_keys: z.array(keySchema).min(1).max(1000),
});

export const saveGalleryOrder = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => saveInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("gallery_orders")
      .upsert(
        {
          gallery_slug: data.gallery_slug,
          order_keys: data.order_keys,
          updated_by: context.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "gallery_slug" },
      );
    if (error) throw new Error(error.message);
    return { ok: true, count: data.order_keys.length, savedAt: Date.now() };
  });

// -------------------------------------------------------------------------
// resetGalleryOrder — drop the override, fall back to the manifest default.
// -------------------------------------------------------------------------
const resetInput = z.object({ gallery_slug: slugSchema });

export const resetGalleryOrder = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => resetInput.parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("gallery_orders")
      .delete()
      .eq("gallery_slug", data.gallery_slug);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
