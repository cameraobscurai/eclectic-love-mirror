// Admin image-editor server functions.
// Gated by requireAdmin. Single source of truth = inventory_items.images text[].
// Position 0 IS the cover. card_background_url lives in its own column.
//
// W1.2: Every privileged mutation reads the row ONCE, uses that snapshot for
// both the concurrency check AND the audit `before` field, then writes. The
// read and write are not in a transaction — a concurrent writer could land
// between them. Accepted tradeoff: the audit row reflects what the handler
// saw, not what the DB ended up with. Snapshot wins.
// TODO(W2.2): swap `Error("STALE: ...")` for `AppError("STALE", ..., 409)`.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import { audit } from "@/server/_audit.server";

const urlSchema = z.string().url().max(2000);

const updateImagesInput = z.object({
  id: z.string().uuid(),
  images: z.array(urlSchema).max(50),
  expectedLength: z.number().int().min(0).optional(),
  // Optional for back-compat; once all call sites pass it, make required.
  expectedUpdatedAt: z.string().datetime({ offset: true }).optional(),
});

export const updateItemImages = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => updateImagesInput.parse(d))
  .handler(async ({ data, context }) => {
    // 1. Read once — drives both concurrency check AND audit `before`.
    const { data: current, error: readErr } = await supabaseAdmin
      .from("inventory_items")
      .select("updated_at, images, images_archive")
      .eq("id", data.id)
      .single();
    if (readErr || !current) throw new Error("NOT_FOUND: item missing");

    // 2. Concurrency checks against the snapshot.
    const currentImages = (current.images ?? []) as string[];
    if (
      typeof data.expectedLength === "number" &&
      data.expectedLength !== currentImages.length
    ) {
      throw new Error(
        `STALE: expected ${data.expectedLength} images, found ${currentImages.length}. Refresh and try again.`,
      );
    }
    if (
      data.expectedUpdatedAt &&
      current.updated_at !== data.expectedUpdatedAt
    ) {
      throw new Error("STALE: someone else edited this item. Refresh and try again.");
    }

    // 3. Mutate. Archive previous snapshot, capped to last 20.
    const archive = Array.isArray(current.images_archive)
      ? (current.images_archive as unknown[])
      : [];
    const nextArchive = [
      ...archive,
      { at: new Date().toISOString(), images: currentImages },
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

    // 4. Audit — before is the snapshot we read, after is the mutated fields.
    // Race-window note: a concurrent writer could have landed between read
    // and write; the audit row reflects the handler's view, not the DB's.
    void audit({
      actorId: context.userId,
      entity: "inventory_items",
      entityId: data.id,
      action: "update_images",
      before: { images: currentImages },
      after: { images: data.images },
    });

    return { ok: true, length: data.images.length };
  });

const setBgInput = z.object({
  id: z.string().uuid(),
  url: urlSchema.nullable(),
  expectedUpdatedAt: z.string().datetime({ offset: true }).optional(),
});

export const setCardBackground = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => setBgInput.parse(d))
  .handler(async ({ data, context }) => {
    // 1. Read once.
    const { data: current, error: readErr } = await supabaseAdmin
      .from("inventory_items")
      .select("updated_at, card_background_url")
      .eq("id", data.id)
      .single();
    if (readErr || !current) throw new Error("NOT_FOUND: item missing");

    // 2. Concurrency check.
    if (
      data.expectedUpdatedAt &&
      current.updated_at !== data.expectedUpdatedAt
    ) {
      throw new Error("STALE: someone else edited this item. Refresh and try again.");
    }

    // 3. Mutate.
    const { error } = await supabaseAdmin
      .from("inventory_items")
      .update({ card_background_url: data.url })
      .eq("id", data.id);
    if (error) throw error;

    // 4. Audit.
    void audit({
      actorId: context.userId,
      entity: "inventory_items",
      entityId: data.id,
      action: "set_card_background",
      before: { card_background_url: current.card_background_url },
      after: { card_background_url: data.url },
    });

    return { ok: true };
  });

const setFocalInput = z.object({
  id: z.string().uuid(),
  x: z.number().min(0).max(1).nullable(),
  y: z.number().min(0).max(1).nullable(),
});

export const setCoverFocal = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => setFocalInput.parse(d))
  .handler(async ({ data, context }) => {
    // Both must be set or both cleared — no half-set focal points.
    const both = data.x !== null && data.y !== null;
    const neither = data.x === null && data.y === null;
    if (!both && !neither) throw new Error("focal x and y must both be set or both null");

    const { data: current } = await supabaseAdmin
      .from("inventory_items")
      .select("cover_focal_x, cover_focal_y")
      .eq("id", data.id)
      .single();

    const { error } = await supabaseAdmin
      .from("inventory_items")
      .update({ cover_focal_x: data.x, cover_focal_y: data.y })
      .eq("id", data.id);
    if (error) throw error;

    void audit({
      actorId: context.userId,
      entity: "inventory_items",
      entityId: data.id,
      action: "set_cover_focal",
      before: { x: current?.cover_focal_x ?? null, y: current?.cover_focal_y ?? null },
      after: { x: data.x, y: data.y },
    });

    return { ok: true };
  });

const uploadInput = z.object({
  id: z.string().uuid(),
  rmsId: z.string().min(1).max(100).regex(/^[a-zA-Z0-9._-]+$/).nullable(),
  filename: z.string().min(1).max(200),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"]),
  base64: z.string().min(1).max(15_000_000), // ~10MB raw before base64 inflation
});

// Storage-only: writes to `squarespace-mirror` and returns the URL.
// Does NOT modify inventory_items — caller appends via updateItemImages,
// which has its own concurrency guard + audit. Hash-based path = automatic
// dedup: same bytes uploaded twice resolve to the same URL with no waste.
export const uploadItemImage = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => uploadInput.parse(d))
  .handler(async ({ data, context }) => {
    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    if (bytes.byteLength > 10 * 1024 * 1024) {
      throw new Error("File exceeds 10MB limit");
    }

    const rawExt = data.filename.split(".").pop()?.toLowerCase() || "jpg";
    // HEIC/HEIF: reject explicitly so iPhone users get a clear message.
    if (["heic", "heif"].includes(rawExt)) {
      throw new Error("HEIC not supported — export as JPG or PNG and re-upload.");
    }
    const safeExt = ["jpg", "jpeg", "png", "webp", "avif"].includes(rawExt) ? rawExt : "jpg";
    const folder = data.rmsId || data.id;

    // Content-hash the bytes (SHA-256, first 16 hex chars = 64 bits, ample
    // for dedup within a single item folder). Same image = same path, so
    // re-uploading the identical file simply returns the existing URL.
    const hashBuf = await crypto.subtle.digest("SHA-256", bytes);
    const hashHex = Array.from(new Uint8Array(hashBuf))
      .slice(0, 8)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const path = `inventory/${folder}/${hashHex}.${safeExt}`;

    const bucket = supabaseAdmin.storage.from("squarespace-mirror");
    const { error: upErr } = await bucket.upload(path, bytes, {
      contentType: data.contentType,
      upsert: false,
    });

    let deduped = false;
    if (upErr) {
      // Supabase returns "The resource already exists" / status 409 when the
      // path is taken. Treat that as a successful dedup hit.
      const msg = upErr.message?.toLowerCase() ?? "";
      if (msg.includes("already exists") || msg.includes("duplicate")) {
        deduped = true;
      } else {
        throw upErr;
      }
    }

    const { data: pub } = bucket.getPublicUrl(path);

    void audit({
      actorId: context.userId,
      entity: "storage",
      entityId: data.id,
      action: deduped ? "upload_image_deduped" : "upload_image",
      metadata: {
        bucket: "squarespace-mirror",
        path,
        bytes: bytes.byteLength,
        contentType: data.contentType,
        filename: data.filename,
        hash: hashHex,
        deduped,
      },
    });

    return { url: pub.publicUrl, path, deduped };
  });

