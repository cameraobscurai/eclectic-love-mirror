// Admin Style Builder server functions.
// Most are gated by requireAdmin; getStyleBoardByToken is intentionally public
// (the share token is the only secret) and uses supabaseAdmin to bypass RLS
// after validating the token.

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
  pin_notes: Record<string, string>;
  palette: {}[];
  tones: Record<string, {}>;
  insights: {}[];
  curator_notes: string | null;
  share_token: string | null;
  sent_at: string | null;
  client_view_count: number;
  last_viewed_at: string | null;
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
  item_snapshots: Record<string, {}>[];
  metadata: Record<string, {}>;
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
  pinNotes: z.record(z.string(), z.string()).default({}),
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
      pin_notes: data.pinNotes ?? {},
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

// Derive a human display name from auth user. Prefers user_metadata.full_name,
// then user_metadata.name, then the email local part titlecased. Never returns
// an empty string — falls back to "The Studio".
function deriveSenderName(user: { email?: string | null; user_metadata?: Record<string, unknown> | null } | null): string {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const full = typeof meta.full_name === "string" ? meta.full_name.trim() : "";
  if (full) return full;
  const name = typeof meta.name === "string" ? meta.name.trim() : "";
  if (name) return name;
  const email = user?.email ?? "";
  const local = email.split("@")[0] ?? "";
  if (local) {
    return local
      .replace(/[._-]+/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }
  return "The Studio";
}

// AI-derive an editorial project title from the board's palette + curator notes
// + client name. Three to six words, no quotes, evocative not literal. Returns
// null if generation fails — caller falls back to deterministic derivation.
async function aiDeriveProjectTitle(input: {
  clientName: string;
  curatorNotes: string | null;
  palette: unknown[];
  tones: Record<string, unknown>;
}): Promise<string | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  try {
    const { generateText } = await import("ai");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);
    const swatchSummary = (input.palette as Array<{ hex?: string; name?: string }>)
      .filter((s) => s && s.hex)
      .map((s) => (s.name ? `${s.name} (${s.hex})` : s.hex))
      .slice(0, 10)
      .join(", ");
    const toneSummary = Object.entries(input.tones)
      .filter(([, v]) => typeof v === "number" && (v as number) > 0)
      .map(([k, v]) => `${k}:${v}`)
      .join(" ");
    const prompt = `You name editorial style proposals for an interior design studio (Eclectic Hive).

Client: ${input.clientName || "Unnamed"}
Palette: ${swatchSummary || "none"}
Tones: ${toneSummary || "none"}
Curator notes: ${input.curatorNotes?.slice(0, 400) || "none"}

Write ONE project title. Rules:
- 3 to 6 words, Title Case
- Evocative, never literal (e.g. "A Study in Moss & Chestnut", "The Quiet Room", "Lowlight & Linen")
- No quotes, no trailing punctuation, no the client's name
- Editorial, restrained, never marketing-speak

Return ONLY the title, nothing else.`;
    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      prompt,
    });
    const cleaned = text.trim().replace(/^["'""]+|["'""]+$/g, "").replace(/\.$/, "").trim();
    if (!cleaned || cleaned.length > 80 || cleaned.split(/\s+/).length > 8) return null;
    return cleaned;
  } catch (err) {
    console.error("[aiDeriveProjectTitle] failed:", err);
    return null;
  }
}

export const markBoardSent = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ boardId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Idempotent: if already sent and has a token, return it.
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("style_boards")
      .select("id,share_token,status,project_title,prepared_by_name,palette,tones,curator_notes,inquiry_id")
      .eq("id", data.boardId)
      .single();
    if (exErr) throw exErr;

    const token = existing.share_token ?? crypto.randomUUID();
    const update: {
      share_token: string;
      status: "sent";
      sent_at?: string;
      prepared_by_user_id?: string;
      prepared_by_name?: string;
      project_title?: string;
    } = {
      share_token: token,
      status: "sent",
    };

    // First-send bookkeeping: capture sender + AI title only on the first send.
    if (!existing.share_token) {
      update.sent_at = new Date().toISOString();

      // Capture sender from authenticated admin.
      try {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(context.userId);
        const u = userData?.user ?? null;
        update.prepared_by_user_id = context.userId;
        update.prepared_by_name = deriveSenderName(
          u as { email?: string | null; user_metadata?: Record<string, unknown> | null } | null,
        );
      } catch (err) {
        console.error("[markBoardSent] sender lookup failed:", err);
      }

      // AI-derive project title if not already set.
      const existingTitle = (existing as unknown as { project_title?: string | null }).project_title;
      if (!existingTitle) {
        // Fetch client name for prompt context.
        const { data: inq } = await supabaseAdmin
          .from("inquiries")
          .select("name")
          .eq("id", existing.inquiry_id)
          .maybeSingle();
        const aiTitle = await aiDeriveProjectTitle({
          clientName: inq?.name ?? "",
          curatorNotes: existing.curator_notes as string | null,
          palette: (existing.palette ?? []) as unknown[],
          tones: (existing.tones ?? {}) as Record<string, unknown>,
        });
        if (aiTitle) update.project_title = aiTitle;
      }
    }

    const { data: row, error } = await supabaseAdmin
      .from("style_boards")
      .update(update)
      .eq("id", data.boardId)
      .select("*")
      .single();
    if (error) throw error;
    return row as unknown as StyleBoardRow;
  });

export interface StudioBoardSummary {
  id: string;
  inquiry_id: string;
  status: "draft" | "ready" | "sent";
  updated_at: string;
  share_token: string | null;
  inquiry_name: string;
  inquiry_subject: string | null;
  pinned_count: number;
  inspo_count: number;
}

export const listStudioBoards = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("style_boards")
      .select("id,inquiry_id,status,updated_at,share_token,pinned_rms_ids,inspo_images,inquiries!inner(name,subject)")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return ((data ?? []) as unknown as Array<{
      id: string;
      inquiry_id: string;
      status: "draft" | "ready" | "sent";
      updated_at: string;
      share_token: string | null;
      pinned_rms_ids: string[];
      inspo_images: unknown[];
      inquiries: { name: string; subject: string | null };
    }>).map((r) => ({
      id: r.id,
      inquiry_id: r.inquiry_id,
      status: r.status,
      updated_at: r.updated_at,
      share_token: r.share_token,
      inquiry_name: r.inquiries?.name ?? "",
      inquiry_subject: r.inquiries?.subject ?? null,
      pinned_count: (r.pinned_rms_ids ?? []).length,
      inspo_count: (r.inspo_images ?? []).length,
    })) as StudioBoardSummary[];
  });

// ---- PUBLIC: client-facing board view by share token ---------------------

export interface PublicPinnedItem {
  id: string;
  rms_id: string | null;
  title: string;
  image_url: string | null;
  category: string | null;
  note: string;
}

export interface PublicStyleBoard {
  id: string;
  status: "sent";
  sent_at: string | null;
  curator_notes: string | null;
  palette: {}[];
  tones: Record<string, {}>;
  insights: {}[];
  inspo: Array<{ id: string; name: string; url: string }>;
  pinned: PublicPinnedItem[];
  client_name: string;
  cover_pinned_rms_id: string | null;
  project_title: string | null;
  prepared_by_name: string | null;
}

export const getStyleBoardByToken = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ token: z.string().min(8).max(64) }).parse(d))
  .handler(async ({ data }) => {
    const { data: board, error } = await supabaseAdmin
      .from("style_boards")
      .select("id,status,sent_at,curator_notes,palette,tones,insights,inspo_images,pinned_rms_ids,pin_notes,inquiry_id,client_view_count,cover_pinned_rms_id")
      .eq("share_token", data.token)
      .eq("status", "sent")
      .maybeSingle();
    if (error) throw error;
    if (!board) throw new Response("Not found", { status: 404 });

    const { data: inq } = await supabaseAdmin
      .from("inquiries")
      .select("name")
      .eq("id", board.inquiry_id)
      .maybeSingle();

    // Sign inspo URLs.
    const inspoRecords = ((board.inspo_images ?? []) as unknown) as InspoImageRecord[];
    const paths = inspoRecords.map((i) => i.storage_path);
    let signedMap: Record<string, string> = {};
    if (paths.length) {
      const { data: signed } = await supabaseAdmin
        .storage.from("studio-inspo")
        .createSignedUrls(paths, 60 * 60 * 24);
      for (const s of signed ?? []) {
        if (s.path && s.signedUrl) signedMap[s.path] = s.signedUrl;
      }
    }

    // Resolve pinned rms_ids -> inventory_items.
    const pinnedIds = (board.pinned_rms_ids ?? []) as string[];
    const pinNotes = (board.pin_notes ?? {}) as Record<string, string>;
    const items: PublicPinnedItem[] = [];
    if (pinnedIds.length) {
      const { data: rows } = await supabaseAdmin
        .from("inventory_items")
        .select("id,rms_id,title,images,category")
        .in("rms_id", pinnedIds);
      const byRms = new Map((rows ?? []).map((r) => [String(r.rms_id), r]));
      for (const rmsId of pinnedIds) {
        const r = byRms.get(rmsId);
        if (!r) continue;
        const imgs = (r.images ?? []) as string[];
        items.push({
          id: String(r.id),
          rms_id: r.rms_id ?? null,
          title: r.title,
          image_url: imgs[0] ?? null,
          category: r.category ?? null,
          note: pinNotes[rmsId] ?? "",
        });
      }
    }


    // Increment view count (non-fatal).
    void supabaseAdmin
      .from("style_boards")
      .update({
        client_view_count: ((board as unknown as { client_view_count?: number }).client_view_count ?? 0) + 1,
        last_viewed_at: new Date().toISOString(),
      })
      .eq("id", board.id)
      .then(() => undefined, () => undefined);

    return {
      id: board.id,
      status: "sent" as const,
      sent_at: board.sent_at as string | null,
      curator_notes: board.curator_notes as string | null,
      palette: (board.palette ?? []) as {}[],
      tones: (board.tones ?? {}) as Record<string, {}>,
      insights: (board.insights ?? []) as {}[],
      inspo: inspoRecords.map((i) => ({
        id: i.id,
        name: i.name,
        url: signedMap[i.storage_path] ?? "",
      })).filter((i) => i.url),
      pinned: items,
      client_name: inq?.name ?? "",
      cover_pinned_rms_id: board.cover_pinned_rms_id ?? null,
    } satisfies PublicStyleBoard;
  });
