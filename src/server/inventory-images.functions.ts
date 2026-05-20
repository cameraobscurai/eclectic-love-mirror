// Admin image-editor server functions.
// Gated by requireAdmin. Single source of truth = inventory_items.images text[].
// Position 0 IS the cover. card_background_url lives in its own column.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";

const urlSchema = z.string().url().max(2000);

const updateImagesInput = z.object({
  id: z.string().uuid(),
  images: z.array(urlSchema).max(50),
  expectedLength: z.number().int().min(0).optional(),
});

export const updateItemImages = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => updateImagesInput.parse(d))
  .handler(async ({ data }) => {
    // Read current row for concurrency check + archive snapshot.
    const { data: row, error: readErr } = await supabaseAdmin
      .from("inventory_items")
      .select("images, images_archive")
      .eq("id", data.id)
      .single();
    if (readErr) throw readErr;

    const current = (row?.images ?? []) as string[];
    if (
      typeof data.expectedLength === "number" &&
      data.expectedLength !== current.length
    ) {
      throw new Error(
        `Concurrent edit detected (expected ${data.expectedLength} images, found ${current.length}). Refresh and try again.`,
      );
    }

    // Append previous snapshot to images_archive (capped to last 20 snapshots).
    const archive = Array.isArray(row?.images_archive)
      ? (row!.images_archive as unknown[])
      : [];
    const nextArchive = [
      ...archive,
      { at: new Date().toISOString(), images: current },
    ].slice(-20);

    const { error } = await supabaseAdmin
      .from("inventory_items")
      .update({
        images: data.images,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        images_archive: nextArchive as any,
      })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true, length: data.images.length };
  });

const setBgInput = z.object({
  id: z.string().uuid(),
  url: urlSchema.nullable(),
});

export const setCardBackground = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => setBgInput.parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("inventory_items")
      .update({ card_background_url: data.url })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

const uploadInput = z.object({
  id: z.string().uuid(),
  rmsId: z.string().min(1).max(100).regex(/^[a-zA-Z0-9._-]+$/).nullable(),
  filename: z.string().min(1).max(200),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"]),
  base64: z.string().min(1).max(15_000_000), // ~10MB raw before base64 inflation
});

export const uploadItemImage = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => uploadInput.parse(d))
  .handler(async ({ data }) => {
    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    if (bytes.byteLength > 10 * 1024 * 1024) {
      throw new Error("File exceeds 10MB limit");
    }
    const ext = data.filename.split(".").pop()?.toLowerCase() || "jpg";
    const safeExt = ["jpg", "jpeg", "png", "webp", "avif"].includes(ext) ? ext : "jpg";
    const folder = data.rmsId || data.id;
    const path = `inventory/${folder}/${crypto.randomUUID()}.${safeExt}`;

    const { error: upErr } = await supabaseAdmin.storage
      .from("squarespace-mirror")
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (upErr) throw upErr;

    const { data: pub } = supabaseAdmin.storage
      .from("squarespace-mirror")
      .getPublicUrl(path);
    return { url: pub.publicUrl, path };
  });
