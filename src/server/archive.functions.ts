// src/server/archive.functions.ts
//
// Admin-only server fns for:
//   1. Mirroring a freshly uploaded file from `incoming-photos` (or any other
//      source bucket) into the private `inventory-photo-archive` bucket.
//      Called fire-and-forget by /admin/incoming after each upload.
//   2. Toggling an inventory_items row's public_ready flag (owner hide UI).
//
// Both use the admin (service-role) client. The auth gate is requireAdmin
// (validates bearer + has_role('admin')) so unauthenticated callers can never
// reach the body.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";

const ARCHIVE_BUCKET = "inventory-photo-archive";

// ---------------------------------------------------------------------------
// archiveIncomingFile
// ---------------------------------------------------------------------------

const ALLOWED_SOURCE_BUCKETS = new Set(["incoming-photos", "inventory"]);

const archiveInput = z.object({
  sourceBucket: z.string().min(1).max(64),
  path: z.string().min(1).max(1024),
});

export const archiveIncomingFile = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => archiveInput.parse(input))
  .handler(async ({ data }) => {
    if (!ALLOWED_SOURCE_BUCKETS.has(data.sourceBucket)) {
      return { ok: false, reason: "bucket-not-allowed" as const };
    }
    const archivePath = `${data.sourceBucket}/${data.path}`;

    // Skip if already archived.
    const { data: existing } = await supabaseAdmin.storage
      .from(ARCHIVE_BUCKET)
      .list(data.sourceBucket, {
        search: data.path.split("/").pop() ?? data.path,
        limit: 1,
      });
    if (existing && existing.some((f) => `${data.sourceBucket}/${f.name}` === archivePath)) {
      return { ok: true, skipped: true as const };
    }

    const { data: blob, error: dlErr } = await supabaseAdmin.storage
      .from(data.sourceBucket)
      .download(data.path);
    if (dlErr || !blob) {
      return { ok: false, reason: "download-failed" as const, message: dlErr?.message };
    }

    const { error: upErr } = await supabaseAdmin.storage
      .from(ARCHIVE_BUCKET)
      .upload(archivePath, blob, {
        contentType: blob.type || "application/octet-stream",
        upsert: false,
        cacheControl: "31536000",
      });
    if (upErr && !/already exists|duplicate/i.test(upErr.message)) {
      return { ok: false, reason: "upload-failed" as const, message: upErr.message };
    }
    return { ok: true, archived: true as const };
  });

// ---------------------------------------------------------------------------
// toggleItemVisibility
// ---------------------------------------------------------------------------

const visibilityInput = z.object({
  id: z.string().uuid(),
  publicReady: z.boolean(),
  hiddenNote: z.string().max(500).nullable().optional(),
});

export const toggleItemVisibility = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => visibilityInput.parse(input))
  .handler(async ({ data }) => {
    const patch: { public_ready: boolean; hidden_note?: string | null } = {
      public_ready: data.publicReady,
    };
    if (data.hiddenNote !== undefined) patch.hidden_note = data.hiddenNote;
    const { error } = await supabaseAdmin
      .from("inventory_items")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, publicReady: data.publicReady };
  });
