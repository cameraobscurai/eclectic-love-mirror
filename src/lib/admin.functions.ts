// Admin dashboard server functions.
//
// Gated by requireAdmin (validates Supabase bearer token + has_role('admin')).
// Service-role client is used inside the handler to read inquiry rows; the
// auth gate runs first so unauthenticated callers never reach the query.

import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";

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
