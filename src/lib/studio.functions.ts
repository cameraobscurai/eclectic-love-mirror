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

// AI-derive all editorial copy for a sent board in a single structured call:
// project title, single-word section divider label, and a one-line note per
// pinned category. Notes reference the *actual* pinned pieces (by title) so
// they read as designer voice, not boilerplate. Returns null on any failure;
// caller falls back to deterministic derivation in the renderer.
interface BoardCopy {
  project_title: string;
  section_word: string;
  production_notes: Record<string, string>;
}

async function generateBoardCopy(input: {
  clientName: string;
  curatorNotes: string | null;
  palette: unknown[];
  tones: Record<string, unknown>;
  pinnedByCategory: Record<string, string[]>; // slug -> array of item titles
}): Promise<BoardCopy | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  const categories = Object.keys(input.pinnedByCategory).filter(
    (slug) => (input.pinnedByCategory[slug] ?? []).length > 0,
  );
  try {
    const { generateText, Output } = await import("ai");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { z: zod } = await import("zod");
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
    const piecesBlock = categories
      .map((slug) => {
        const items = (input.pinnedByCategory[slug] ?? []).slice(0, 8).join("; ");
        return `- ${slug}: ${items}`;
      })
      .join("\n");

    // Build a narrow per-slug schema so the model returns notes only for
    // categories that actually have pinned pieces. Keeps Gemini's constrained
    // decoding state machine small.
    const notesShape = categories.reduce<Record<string, ReturnType<typeof zod.string>>>(
      (acc, slug) => {
        acc[slug] = zod.string();
        return acc;
      },
      {},
    );

    const prompt = `You write editorial copy for an interior design studio (Eclectic Hive) sending a curated style proposal to a client. Output is a printed-feel document, not marketing copy.

Client: ${input.clientName || "Unnamed"}
Palette: ${swatchSummary || "none"}
Tones: ${toneSummary || "none"}
Curator's own notes: ${input.curatorNotes?.slice(0, 600) || "none"}

Pinned pieces by category (these are the ACTUAL items on the board — reference them):
${piecesBlock || "none"}

Write three things:

1. project_title — ONE title for this proposal. 3–6 words, Title Case. Evocative, never literal. Never include the client's name. Examples: "A Study in Moss & Chestnut", "The Quiet Room", "Lowlight & Linen", "Late Afternoon, Slow".

2. section_word — ONE single word that introduces the pieces section of the deck. Editorial, slightly poetic. Examples: "Pieces", "Anchors", "Elements", "Materials", "Vessels". One word only.

3. production_notes — For EACH category in the pinned list, write ONE sentence (max 18 words) of art direction. Reference real pieces by name when natural. Specific to what was pinned. Never fabricate facts the client didn't mention (no "firepit", "dining table", "the bar" unless those items appear in the pieces). Editorial restraint, no exclamation marks.

Return JSON matching the schema.`;

    const { experimental_output: output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      prompt,
      experimental_output: Output.object({
        schema: zod.object({
          project_title: zod.string(),
          section_word: zod.string(),
          production_notes: zod.object(notesShape),
        }),
      }),
    });

    if (!output) return null;
    const title = output.project_title.trim().replace(/^["'""]+|["'""]+$/g, "").replace(/\.$/, "").trim();
    const word = output.section_word.trim().replace(/[^A-Za-z]/g, "");
    if (!title || title.split(/\s+/).length > 8) return null;
    if (!word) return null;

    const cleanedNotes: Record<string, string> = {};
    for (const [slug, note] of Object.entries(output.production_notes)) {
      if (typeof note === "string" && note.trim()) {
        cleanedNotes[slug] = note.trim();
      }
    }

    return {
      project_title: title,
      section_word: word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
      production_notes: cleanedNotes,
    };
  } catch (err) {
    console.error("[generateBoardCopy] failed:", err);
    return null;
  }
}

// ---- Share-token helpers (PR 3) ------------------------------------------
// Tokens are 256-bit random values, base64url-encoded. We store only the
// SHA-256 hash + an expiry + a revoked_at, plus (transitionally) the raw
// token so admin UI can still show/copy the link after a page reload. A
// follow-up migration will drop the raw column once admin flow is
// converted to "show once at issue time".

function generateShareTokenValue(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  // base64url without padding
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hashShareToken(token: string): Promise<string> {
  const buf = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
  return hex;
}

const DEFAULT_SHARE_TOKEN_TTL_DAYS = 90;

export const markBoardSent = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ boardId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Idempotent: if already sent and has a token, return it.
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("style_boards")
      .select("id,share_token,share_token_hash,share_token_expires_at,share_token_revoked_at,status,project_title,section_word,production_notes,prepared_by_name,palette,tones,curator_notes,inquiry_id,pinned_rms_ids")
      .eq("id", data.boardId)
      .single();
    if (exErr) throw exErr;

    const existingToken = (existing as unknown as { share_token: string | null }).share_token;
    const token = existingToken ?? generateShareTokenValue();
    const tokenHash = await hashShareToken(token);
    const update: {
      share_token: string;
      share_token_hash: string;
      share_token_expires_at?: string;
      share_token_revoked_at?: null;
      status: "sent";
      sent_at?: string;
      prepared_by_user_id?: string;
      prepared_by_name?: string;
      project_title?: string;
      section_word?: string;
      production_notes?: Record<string, string>;
    } = {
      share_token: token,
      share_token_hash: tokenHash,
      status: "sent",
    };

    // First-send bookkeeping: capture sender + AI copy only on the first send.
    if (!existingToken) {
      update.sent_at = new Date().toISOString();
      update.share_token_expires_at = new Date(
        Date.now() + DEFAULT_SHARE_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString();
      // Clear any prior revoke (shouldn't happen on first send, but idempotent).
      update.share_token_revoked_at = null;

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

      // AI-derive editorial copy if not already set.
      const existingTitle = (existing as unknown as { project_title?: string | null }).project_title;
      if (!existingTitle) {
        const { data: inq } = await supabaseAdmin
          .from("inquiries")
          .select("name")
          .eq("id", existing.inquiry_id)
          .maybeSingle();

        const pinnedIds = (existing.pinned_rms_ids ?? []) as string[];
        const pinnedByCategory: Record<string, string[]> = {};
        if (pinnedIds.length) {
          const { data: rows } = await supabaseAdmin
            .from("inventory_items")
            .select("rms_id,title,category")
            .in("rms_id", pinnedIds);
          for (const r of rows ?? []) {
            const slug = r.category ?? "other";
            (pinnedByCategory[slug] ??= []).push(r.title);
          }
        }

        const copy = await generateBoardCopy({
          clientName: inq?.name ?? "",
          curatorNotes: existing.curator_notes as string | null,
          palette: (existing.palette ?? []) as unknown[],
          tones: (existing.tones ?? {}) as Record<string, unknown>,
          pinnedByCategory,
        });
        if (copy) {
          update.project_title = copy.project_title;
          update.section_word = copy.section_word;
          update.production_notes = copy.production_notes;
        }
      }
    }

    const { data: row, error } = await supabaseAdmin
      .from("style_boards")
      .update(update)
      .eq("id", data.boardId)
      .select("*")
      .single();
    if (error) throw error;

    // Fire client email only on the first send. Idempotent thereafter — the
    // email is keyed by boardId, so re-runs coalesce in email_send_log.
    if (!existingToken) {
      try {
        await enqueueStyleBoardEmail({
          boardId: row.id,
          shareToken: token,
          inquiryId: row.inquiry_id as string,
          projectTitle: (row.project_title as string | null) ?? null,
          preparedByName: (row.prepared_by_name as string | null) ?? null,
          palette: (row.palette ?? []) as unknown[],
          pinnedRmsIds: (row.pinned_rms_ids ?? []) as string[],
        });
      } catch (err) {
        console.error("[markBoardSent] email enqueue failed:", err);
      }
    }

    return row as unknown as StyleBoardRow;
  });

// Revoke a board's share link. Idempotent — safe to call on already-revoked
// boards. Public loader rejects tokens with share_token_revoked_at set.
export const revokeShareToken = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ boardId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("style_boards")
      .update({ share_token_revoked_at: new Date().toISOString() })
      .eq("id", data.boardId)
      .select("id,share_token_revoked_at")
      .single();
    if (error) throw error;
    return { boardId: row.id, revokedAt: (row as unknown as { share_token_revoked_at: string }).share_token_revoked_at };
  });



// ---- Client email on first send ------------------------------------------
// Renders the `style-board-ready` React Email template and enqueues it on
// the `transactional_emails` pgmq queue. Mirrors the pattern used by
// /api/public/notify-inquiry: suppression check, unsubscribe token,
// pending log row, then rpc('enqueue_email').

function generateUnsubToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function enqueueStyleBoardEmail(input: {
  boardId: string;
  shareToken: string;
  inquiryId: string;
  projectTitle: string | null;
  preparedByName: string | null;
  palette: unknown[];
  pinnedRmsIds: string[];
}): Promise<void> {
  const SITE_NAME = "Eclectic Hive";
  const SENDER_DOMAIN = "notify.eclectichive.com";
  const FROM_DOMAIN = "eclectichive.com";
  const TEMPLATE_NAME = "style-board-ready";

  const React = await import("react");
  const { render } = await import("@react-email/render");
  const { TEMPLATES } = await import("./email-templates/registry");
  const template = TEMPLATES[TEMPLATE_NAME];
  if (!template) throw new Error("style-board-ready template missing");

  // Recipient + name
  const { data: inq } = await supabaseAdmin
    .from("inquiries")
    .select("name,email")
    .eq("id", input.inquiryId)
    .maybeSingle();
  const recipient = (inq?.email ?? "").trim();
  if (!recipient) throw new Error("Inquiry has no recipient email");
  const normalizedEmail = recipient.toLowerCase();

  // Suppression check — respects bounces/complaints/unsubscribes.
  const { data: suppressed } = await supabaseAdmin
    .from("suppressed_emails")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  const messageId = crypto.randomUUID();
  const idempotencyKey = `style-board-${input.boardId}`;

  if (suppressed) {
    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: TEMPLATE_NAME,
      recipient_email: recipient,
      status: "suppressed",
    });
    return;
  }

  // Pinned preview — first 4 items with title/category/image.
  const pinnedPreview: Array<{ title: string; category: string | null; image_url: string | null }> = [];
  if (input.pinnedRmsIds.length) {
    const { data: rows } = await supabaseAdmin
      .from("inventory_items")
      .select("rms_id,title,category,images")
      .in("rms_id", input.pinnedRmsIds.slice(0, 8));
    // Preserve pin order.
    const byId = new Map((rows ?? []).map((r) => [r.rms_id, r]));
    for (const id of input.pinnedRmsIds) {
      const r = byId.get(id);
      if (!r) continue;
      const imgs = (r.images ?? []) as Array<{ url?: string } | string>;
      const first = imgs[0];
      const url = typeof first === "string" ? first : first?.url ?? null;
      pinnedPreview.push({
        title: r.title ?? "",
        category: r.category ?? null,
        image_url: url,
      });
      if (pinnedPreview.length >= 4) break;
    }
  }

  const paletteHex = (input.palette as Array<{ hex?: string }>)
    .map((s) => s?.hex)
    .filter((h): h is string => typeof h === "string" && /^#[0-9a-fA-F]{6}$/.test(h))
    .slice(0, 8);

  const templateData = {
    clientName: inq?.name ?? "there",
    projectTitle: input.projectTitle,
    preparedByName: input.preparedByName,
    boardUrl: `https://${FROM_DOMAIN}/stylebrief/${input.shareToken}`,
    pinnedCount: input.pinnedRmsIds.length,
    paletteCount: paletteHex.length,
    palette: paletteHex,
    pinnedPreview,
  };

  // Unsubscribe token (reuse or mint).
  let unsubToken: string;
  const { data: existingTok } = await supabaseAdmin
    .from("email_unsubscribe_tokens")
    .select("token, used_at")
    .eq("email", normalizedEmail)
    .maybeSingle();
  if (existingTok && !existingTok.used_at) {
    unsubToken = existingTok.token;
  } else {
    unsubToken = generateUnsubToken();
    await supabaseAdmin
      .from("email_unsubscribe_tokens")
      .upsert(
        { token: unsubToken, email: normalizedEmail },
        { onConflict: "email", ignoreDuplicates: true },
      );
    const { data: stored } = await supabaseAdmin
      .from("email_unsubscribe_tokens")
      .select("token")
      .eq("email", normalizedEmail)
      .maybeSingle();
    if (stored?.token) unsubToken = stored.token;
  }

  const element = React.createElement(template.component, templateData);
  const html = await render(element);
  const text = await render(element, { plainText: true });
  const subject =
    typeof template.subject === "function" ? template.subject(templateData) : template.subject;

  await supabaseAdmin.from("email_send_log").insert({
    message_id: messageId,
    template_name: TEMPLATE_NAME,
    recipient_email: recipient,
    status: "pending",
  });

  const { error: enqueueError } = await supabaseAdmin.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      message_id: messageId,
      to: recipient,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      reply_to: `info@${FROM_DOMAIN}`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: "transactional",
      label: TEMPLATE_NAME,
      idempotency_key: idempotencyKey,
      unsubscribe_token: unsubToken,
      queued_at: new Date().toISOString(),
    },
  });

  if (enqueueError) {
    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: TEMPLATE_NAME,
      recipient_email: recipient,
      status: "failed",
      error_message: enqueueError.message,
    });
    throw enqueueError;
  }
}

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
  section_word: string | null;
  production_notes: Record<string, string>;
}

export const getStyleBoardByToken = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ token: z.string().min(8).max(64) }).parse(d))
  .handler(async ({ data }) => {
    const { data: board, error } = await supabaseAdmin
      .from("style_boards")
      .select("id,status,sent_at,curator_notes,palette,tones,insights,inspo_images,pinned_rms_ids,pin_notes,inquiry_id,client_view_count,cover_pinned_rms_id,project_title,prepared_by_name,section_word,production_notes")
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
      // Signed URLs are re-minted on every share-page load (this loader runs
      // per view). 7-day TTL is a safety margin for link previews and async
      // opens; the actual freshness comes from re-signing per request.
      const { data: signed } = await supabaseAdmin
        .storage.from("studio-inspo")
        .createSignedUrls(paths, 60 * 60 * 24 * 7);
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
        // `images` may be legacy: sometimes string[], sometimes [{ url }, ...].
        // Blindly casting produces "[object Object]" on the public deck.
        const first = (r.images as unknown[] | null)?.[0];
        const image_url =
          typeof first === "string"
            ? first
            : first && typeof first === "object" && "url" in first &&
                typeof (first as { url: unknown }).url === "string"
              ? (first as { url: string }).url
              : null;
        items.push({
          id: String(r.id),
          rms_id: r.rms_id ?? null,
          title: r.title,
          image_url,
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
      project_title: (board as unknown as { project_title?: string | null }).project_title ?? null,
      prepared_by_name: (board as unknown as { prepared_by_name?: string | null }).prepared_by_name ?? null,
      section_word: (board as unknown as { section_word?: string | null }).section_word ?? null,
      production_notes: ((board as unknown as { production_notes?: Record<string, string> }).production_notes ?? {}),
    } satisfies PublicStyleBoard;
  });
