// Public server functions for the client-facing /studio Style Brief.
// No auth required. Uses supabaseAdmin for the inquiries insert (RLS allows
// anon inserts already; service role keeps it consistent + avoids the user
// needing a session). Signed upload URLs let the visitor PUT inspo images
// directly to the studio-inspo bucket without granting anon storage policy.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const INSPO_PREFIX = "public";

// ── 1. Sign one upload URL ───────────────────────────────────────────────
export const signPublicInspoUpload = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      ext: z.string().regex(/^[a-z0-9]{1,8}$/i),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const path = `${INSPO_PREFIX}/${crypto.randomUUID()}/${crypto.randomUUID()}.${data.ext.toLowerCase()}`;
    const { data: signed, error } = await supabaseAdmin
      .storage.from("studio-inspo")
      .createSignedUploadUrl(path);
    if (error) throw error;
    return { uploadUrl: signed.signedUrl, token: signed.token, storage_path: path };
  });

// ── 2. Submit the brief → writes one row to public.inquiries ─────────────

const submitSchema = z.object({
  // Visitor details
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(40).optional().default(""),
  // Event details
  eventDate: z.string().trim().max(40).optional().default(""),
  scope: z.string().trim().max(120).optional().default(""),
  budget: z.string().trim().max(60).optional().default(""),
  // Vibe / message
  vibe: z.string().trim().max(2000).optional().default(""),
  // Style outputs
  paletteHex: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).max(8).default([]),
  tones: z.record(z.string(), z.number()).default({}),
  insightTitles: z.array(z.string().max(80)).max(6).default([]),
  // Storage refs from signPublicInspoUpload
  inspoPaths: z.array(z.string().max(300)).max(8).default([]),
  // Pinned inventory item ids (UUIDs from the Inquiry tray)
  pinnedIds: z.array(z.string().uuid()).max(50).default([]),
  // Honeypot — must be empty
  website: z.string().max(0).optional().default(""),
});

function buildMessage(d: z.infer<typeof submitSchema>): string {
  const parts: string[] = [];
  parts.push("— STYLE BRIEF FROM STUDIO —", "");
  if (d.eventDate) parts.push(`Event date: ${d.eventDate}`);
  if (d.scope) parts.push(`Scope: ${d.scope}`);
  if (d.budget) parts.push(`Budget: ${d.budget}`);
  if (d.phone) parts.push(`Phone: ${d.phone}`);
  if (parts.length > 2) parts.push("");
  if (d.vibe) parts.push("Vision:", d.vibe, "");
  if (d.paletteHex.length) parts.push(`Palette: ${d.paletteHex.join(" · ")}`);
  if (d.insightTitles.length) parts.push(`Read: ${d.insightTitles.join(" · ")}`);
  if (d.pinnedIds.length) parts.push(`Pinned pieces: ${d.pinnedIds.length}`);
  return parts.join("\n").slice(0, 5000);
}

export const submitStyleBrief = createServerFn({ method: "POST" })
  .inputValidator((d) => submitSchema.parse(d))
  .handler(async ({ data }) => {
    if (data.website) {
      // Honeypot tripped — pretend success without writing.
      return { inquiryId: "00000000-0000-0000-0000-000000000000" };
    }

    // Resolve pinned item snapshots (title + first image) for the admin view.
    let snapshots: Array<{ id: string; title: string; image: string | null }> = [];
    if (data.pinnedIds.length) {
      const { data: rows } = await supabaseAdmin
        .from("inventory_items")
        .select("id,title,images")
        .in("id", data.pinnedIds);
      snapshots = (rows ?? []).map((r) => ({
        id: String(r.id),
        title: r.title,
        image: (r.images as string[] | null)?.[0] ?? null,
      }));
    }

    // Trim insights to titles only to stay well under the 4KB metadata cap.
    const metadata = {
      source: "studio",
      palette: data.paletteHex,
      tones: data.tones,
      insights: data.insightTitles,
      inspo_paths: data.inspoPaths,
      event_date: data.eventDate || null,
      scope: data.scope || null,
      budget: data.budget || null,
    };

    const insertPayload = {
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      subject: "Style Brief",
      message: buildMessage(data),
      item_ids: data.pinnedIds,
      item_snapshots: snapshots,
      metadata,
    };

    const { data: row, error } = await supabaseAdmin
      .from("inquiries")
      .insert(insertPayload)
      .select("id")
      .single();
    if (error) throw error;
    return { inquiryId: row.id as string };
  });
