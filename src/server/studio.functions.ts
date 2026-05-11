// Admin Style Builder server functions.
// All gated by requireAdmin. Service-role client used after auth check.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";

export interface InspoImageRecord {
  id: string;
  name: string;
  storage_path: string;
}

export interface StyleBoardRow {
  id: string;
  inquiry_id: string;
  status: "draft" | "ready" | "sent";
  inspo_images: InspoImageRecord[];
  pinned_rms_ids: string[];
  palette: unknown[];
  tones: Record<string, unknown>;
  insights: unknown[];
  curator_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudioInquiry {
  id: string;
  name: string;
  email: string;
  message: string;
  subject: string | null;
  created_at: string;
  item_snapshots: Array<Record<string, unknown>>;
  metadata: Record<string, unknown>;
}

export interface StudioWorkspace {
  inquiry: StudioInquiry;
  board: StyleBoardRow | null;
}

const inquiryIdSchema = z.object({ inquiryId: z.string().uuid() });

export const getStudioWorkspace = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((d) => inquiryIdSchema.parse(d))
  .handler(async ({ data }) => {
    const { data: inq, error: inqErr } = await supabaseAdmin
      .from("inquiries")
      .select("id,name,email,message,subject,created_at,item_snapshots,metadata")
      .eq("id", data.inquiryId)
      .maybeSingle();
    if (inqErr) throw inqErr;
    if (!inq) throw new Response("Inquiry not found", { status: 404 });

    const { data: boards, error: bErr } = await supabaseAdmin
      .from("style_boards")
      .select("*")
      .eq("inquiry_id", data.inquiryId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (bErr) throw bErr;

    return {
      inquiry: inq as unknown as StudioInquiry,
      board: ((boards ?? [])[0] as unknown as StyleBoardRow) ?? null,
    } as { inquiry: StudioInquiry; board: StyleBoardRow | null };
  });

export const signInspoUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) =>
    z.object({
      inquiryId: z.string().uuid(),
      ext: z.string().regex(/^[a-z0-9]{1,8}$/i),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const path = `${data.inquiryId}/${crypto.randomUUID()}.${data.ext.toLowerCase()}`;
    const { data: signed, error } = await supabaseAdmin
      .storage.from("studio-inspo")
      .createSignedUploadUrl(path);
    if (error) throw error;
    return { uploadUrl: signed.signedUrl, token: signed.token, storage_path: path };
  });

export const getInspoSignedUrls = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ paths: z.array(z.string()).max(50) }).parse(d))
  .handler(async ({ data }) => {
    const out: Record<string, string> = {};
    if (!data.paths.length) return out;
    const { data: signed, error } = await supabaseAdmin
      .storage.from("studio-inspo")
      .createSignedUrls(data.paths, 60 * 60);
    if (error) throw error;
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) out[s.path] = s.signedUrl;
    }
    return out;
  });

export const deleteInspoFile = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ path: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.storage.from("studio-inspo").remove([data.path]);
    if (error) throw error;
    return { ok: true };
  });

const saveBoardSchema = z.object({
  inquiryId: z.string().uuid(),
  boardId: z.string().uuid().nullable(),
  status: z.enum(["draft", "ready", "sent"]),
  inspo: z.array(z.object({
    id: z.string(),
    name: z.string(),
    storage_path: z.string(),
  })),
  pinned: z.array(z.string()),
  palette: z.array(z.any()),
  tones: z.record(z.any()),
  insights: z.array(z.any()),
  curatorNotes: z.string().nullable(),
});

export const saveStyleBoard = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => saveBoardSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = {
      inquiry_id: data.inquiryId,
      status: data.status,
      inspo_images: data.inspo,
      pinned_rms_ids: data.pinned,
      palette: data.palette,
      tones: data.tones,
      insights: data.insights,
      curator_notes: data.curatorNotes,
    };
    if (data.boardId) {
      const { data: row, error } = await supabaseAdmin
        .from("style_boards")
        .update(payload)
        .eq("id", data.boardId)
        .select("*")
        .single();
      if (error) throw error;
      return row as unknown as StyleBoardRow;
    }
    const { data: row, error } = await supabaseAdmin
      .from("style_boards")
      .insert({ ...payload, created_by: context.userId })
      .select("*")
      .single();
    if (error) throw error;
    return row as unknown as StyleBoardRow;
  });
