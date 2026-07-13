// Admin dashboard server functions.
//
// Gated by requireAdmin (validates Supabase bearer token + has_role('admin')).
// Service-role client is used inside the handler to read inquiry rows; the
// auth gate runs first so unauthenticated callers never reach the query.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";

const OWNER_REPLY_FROM = "Eclectic Hive <noreply@eclectichive.com>";
const OWNER_REPLY_TO = "info@eclectichive.com";
const OWNER_SENDER_DOMAIN = "notify.eclectichive.com";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---------------------------------------------------------------------------
// replyToInquiry — admin sends a plain reply from the inbox. Enqueues the
// email into `transactional_emails`, logs a pending row, and marks the
// inquiry handled so the open/handled counters reflect the action.
// ---------------------------------------------------------------------------
const replyInput = z.object({
  inquiry_id: z.string().uuid(),
  subject: z.string().min(1).max(250),
  message: z.string().min(1).max(10_000),
});

export const replyToInquiry = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => replyInput.parse(d))
  .handler(async ({ data }) => {
    const { data: inq, error: inqErr } = await supabaseAdmin
      .from("inquiries")
      .select("id, name, email")
      .eq("id", data.inquiry_id)
      .maybeSingle();
    if (inqErr) throw inqErr;
    if (!inq?.email) throw new Error("Inquiry not found");

    const recipient = String(inq.email);
    // Suppression check
    const { data: suppressed } = await supabaseAdmin
      .from("suppressed_emails")
      .select("id")
      .eq("email", recipient.toLowerCase())
      .maybeSingle();
    if (suppressed) {
      return { ok: false as const, reason: "suppressed" as const };
    }

    const messageId = crypto.randomUUID();
    const label = "inquiry-reply";
    const idempotencyKey = `${label}-${messageId}`;
    const bodyText = data.message;
    const bodyHtml = `<!doctype html><html><body style="font-family:Georgia,serif;line-height:1.55;color:#1a1a1a;background:#fff;padding:24px;max-width:600px;margin:0 auto;">${escapeHtml(
      bodyText,
    )
      .split(/\n\n+/)
      .map((p) => `<p style="margin:0 0 1em 0;white-space:pre-wrap;">${p.replace(/\n/g, "<br/>")}</p>`)
      .join("")}<hr style="border:none;border-top:1px solid #d4cdc4;margin:24px 0;"/><p style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#8a8378;">Eclectic Hive · Denver, CO</p></body></html>`;

    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: label,
      recipient_email: recipient,
      status: "pending",
    });

    const { error: enqueueError } = await supabaseAdmin.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        message_id: messageId,
        to: recipient,
        from: OWNER_REPLY_FROM,
        reply_to: OWNER_REPLY_TO,
        sender_domain: OWNER_SENDER_DOMAIN,
        subject: data.subject,
        html: bodyHtml,
        text: bodyText,
        purpose: "transactional",
        label,
        idempotency_key: idempotencyKey,
        queued_at: new Date().toISOString(),
      },
    });

    if (enqueueError) {
      await supabaseAdmin.from("email_send_log").insert({
        message_id: messageId,
        template_name: label,
        recipient_email: recipient,
        status: "failed",
        error_message: enqueueError.message,
      });
      throw new Error(enqueueError.message);
    }

    // Mark handled so counters reflect the reply.
    await supabaseAdmin
      .from("inquiries")
      .update({ handled: true })
      .eq("id", data.inquiry_id);

    return { ok: true as const, messageId };
  });

export interface InquiryRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  handled: boolean;
  created_at: string;
}

export interface InquirySummary {
  total: number;
  open: number;
  handled: number;
  last7d: number;
  last30d: number;
  /** ISO date (YYYY-MM-DD) → count, ordered oldest → newest, last 30 days. */
  daily: { date: string; count: number }[];
  recent: InquiryRow[];
}

export const getInquirySummary = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<InquirySummary> => {
    const { data, error } = await supabaseAdmin
      .from("inquiries")
      .select("id, name, email, phone, subject, message, handled, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    const rows = (data ?? []) as InquiryRow[];

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const cutoff7 = now - 7 * day;
    const cutoff30 = now - 30 * day;

    let open = 0;
    let handled = 0;
    let last7d = 0;
    let last30d = 0;
    const buckets = new Map<string, number>();
    // Seed the last 30 days with zeros so the sparkline has a continuous axis.
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * day).toISOString().slice(0, 10);
      buckets.set(d, 0);
    }

    for (const r of rows) {
      if (r.handled) handled++; else open++;
      const t = new Date(r.created_at).getTime();
      if (t >= cutoff7) last7d++;
      if (t >= cutoff30) last30d++;
      const key = new Date(r.created_at).toISOString().slice(0, 10);
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }

    return {
      total: rows.length,
      open,
      handled,
      last7d,
      last30d,
      daily: Array.from(buckets.entries()).map(([date, count]) => ({ date, count })),
      recent: rows.slice(0, 12),
    };
  },
);

// ---------------------------------------------------------------------------
// /admin/dashboard inventory stats — computed server-side so the 990 KB baked
// catalog JSON never ships to the client bundle. Everything the dashboard
// needs (KPI cards, coverage bars, category mix, image-count histogram) is
// aggregated here and returned as a small payload.
// ---------------------------------------------------------------------------

export interface DashboardInventoryStats {
  total: number;
  publicReady: number;
  excluded: number;
  withImages: number;
  withDimensions: number;
  customOrder: number;
  manualReview: number;
  imageCoverage: number;
  dimensionsCoverage: number;
  topCategories: { display: string; count: number }[];
  imageBuckets: { label: string; count: number }[];
}

export const getDashboardInventoryStats = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<DashboardInventoryStats> => {
    // Dynamic import keeps the baked catalog JSON out of client bundles that
    // transitively reach this module.
    const { getCollectionCatalogBase } = await import("@/lib/phase3-catalog");
    const { products } = await getCollectionCatalogBase();

    const total = products.length;
    let publicReady = 0;
    let withImages = 0;
    let withDimensions = 0;
    let customOrder = 0;
    let manualReview = 0;
    const byCat = new Map<string, number>();
    const buckets = { "0": 0, "1": 0, "2-3": 0, "4-6": 0, "7+": 0 };

    for (const p of products) {
      if (p.publicReady) publicReady++;
      if ((p.imageCount ?? 0) > 0) withImages++;
      if (p.dimensions) withDimensions++;
      if (p.isCustomOrder) customOrder++;
      if (p.needsManualReview) manualReview++;
      byCat.set(p.displayCategory, (byCat.get(p.displayCategory) ?? 0) + 1);
      const c = p.imageCount ?? 0;
      if (c === 0) buckets["0"]++;
      else if (c === 1) buckets["1"]++;
      else if (c <= 3) buckets["2-3"]++;
      else if (c <= 6) buckets["4-6"]++;
      else buckets["7+"]++;
    }

    return {
      total,
      publicReady,
      excluded: total - publicReady,
      withImages,
      withDimensions,
      customOrder,
      manualReview,
      imageCoverage: total ? withImages / total : 0,
      dimensionsCoverage: total ? withDimensions / total : 0,
      topCategories: Array.from(byCat.entries())
        .map(([display, count]) => ({ display, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      imageBuckets: Object.entries(buckets).map(([label, count]) => ({ label, count })),
    };
  });

// ---------------------------------------------------------------------------
// Email queue health — surfaces last cron run timestamp so a stalled
// pg_cron becomes visible instead of silent. The queue processor writes
// last_run_at/last_run_processed/last_run_status on every invocation.
// ---------------------------------------------------------------------------

export interface EmailQueueHealth {
  lastRunAt: string | null;
  lastRunProcessed: number | null;
  lastRunStatus: string | null;
  retryAfterUntil: string | null;
  pending: number; // rows in email_send_log with status='pending' in last 24h
  failedLast24h: number;
  /** true when there is pending work AND lastRunAt is >10 min old (or null). */
  stalled: boolean;
}

export const getEmailQueueHealth = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<EmailQueueHealth> => {
    const { data: state } = await supabaseAdmin
      .from("email_send_state")
      .select("last_run_at, last_run_processed, last_run_status, retry_after_until")
      .eq("id", 1)
      .maybeSingle();

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: pending } = await supabaseAdmin
      .from("email_send_log")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .gte("created_at", dayAgo);
    const { count: failed } = await supabaseAdmin
      .from("email_send_log")
      .select("*", { count: "exact", head: true })
      .in("status", ["failed", "dlq"])
      .gte("created_at", dayAgo);

    const lastRunAt = (state?.last_run_at as string | null) ?? null;
    const hasWork = (pending ?? 0) > 0;
    const tenMinAgo = Date.now() - 10 * 60 * 1000;
    const stalled = hasWork && (!lastRunAt || new Date(lastRunAt).getTime() < tenMinAgo);

    return {
      lastRunAt,
      lastRunProcessed: (state?.last_run_processed as number | null) ?? null,
      lastRunStatus: (state?.last_run_status as string | null) ?? null,
      retryAfterUntil: (state?.retry_after_until as string | null) ?? null,
      pending: pending ?? 0,
      failedLast24h: failed ?? 0,
      stalled,
    };
  });
