// Admin dashboard server functions.
//
// These bypass RLS via the service role client because the test admin
// dashboard at /admin is intentionally unauthenticated for now (per owner).
// When auth is added, swap supabaseAdmin for the requireSupabaseAuth
// middleware + a has_role('admin') gate.

import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

export const getInquirySummary = createServerFn({ method: "GET" }).handler(
  async (): Promise<InquirySummary> => {
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
