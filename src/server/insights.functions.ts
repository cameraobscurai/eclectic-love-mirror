// /admin/insights — server functions.
//
// These pull the data Eclectic Hive's owner actually needs to make decisions:
//   • Conversion KPIs (this week vs last)
//   • The inquiry inbox (with outcome status + value)
//   • Which CATALOG items are mentioned in inquiry messages most often
//   • Category demand heat map (inquiries × category)
//   • Dead stock — items that have never been mentioned in any inquiry
//
// All gated by requireAdmin. Catalog joins happen on the server using the
// pre-baked JSON catalog so we don't burn a DB query just to label rows.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import { getCollectionCatalog } from "@/lib/phase3-catalog";

export type InquiryStatus = "new" | "quoted" | "booked" | "lost" | "ghosted";

export interface InsightsInquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  created_at: string;
  status: InquiryStatus;
  quote_value: number | null;
  outcome_notes: string | null;
  outcome_updated_at: string | null;
  /** Catalog-joined item names found in the inquiry's body. */
  mentioned_items: { id: string; title: string; category: string }[];
}

export interface InsightsKpis {
  inquiries_this_week: number;
  inquiries_last_week: number;
  inquiries_this_month: number;
  inquiries_last_month: number;
  open_count: number;
  booked_count: number;
  booked_value_total: number; // sum of quote_value where status = 'booked'
  pipeline_value: number;     // sum of quote_value where status in ('quoted','new')
  /** ISO date → count, last 30 days oldest → newest. */
  daily: { date: string; count: number }[];
}

export interface CategoryDemand {
  category: string;
  inquiry_mentions: number;
  inventory_count: number;
  /** mentions per 100 SKUs in the category — normalizes for collection size. */
  intensity: number;
}

export interface ItemDemand {
  id: string;
  title: string;
  category: string;
  mention_count: number;
  image_url: string | null;
}

export interface InsightsPayload {
  kpis: InsightsKpis;
  inquiries: InsightsInquiry[];
  top_items: ItemDemand[];
  dead_stock: ItemDemand[];
  category_demand: CategoryDemand[];
}

const ISO = (d: Date) => d.toISOString().slice(0, 10);
const DAY = 24 * 60 * 60 * 1000;

export const getInsights = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<InsightsPayload> => {
    const [{ data: rows, error }, { products }] = await Promise.all([
      supabaseAdmin
        .from("inquiries")
        .select(
          "id, name, email, phone, subject, message, created_at, status, quote_value, outcome_notes, outcome_updated_at",
        )
        .order("created_at", { ascending: false })
        .limit(1000),
      getCollectionCatalog(),
    ]);
    if (error) throw error;

    type Row = NonNullable<typeof rows>[number];
    const inquiryRows = (rows ?? []) as Row[];

    // Pre-build a lower-case title index so we can do O(N×M) substring
    // matching cheaply. With ~835 products and rarely > 100 inquiries this
    // is ~85k comparisons per refresh — trivial.
    const titleIndex = products
      .filter((p) => p.title && p.title.length >= 4)
      .map((p) => ({
        id: p.id,
        title: p.title,
        titleLower: p.title.toLowerCase(),
        category: p.displayCategory ?? "uncategorized",
        image: p.primaryImage?.url ?? null,
      }));

    // Count mentions per item. Each inquiry counts at most once per item.
    const itemMentionCount = new Map<string, number>();
    const inquiriesEnriched: InsightsInquiry[] = inquiryRows.map((r) => {
      const haystack = (r.message ?? "").toLowerCase();
      const mentioned: { id: string; title: string; category: string }[] = [];
      for (const t of titleIndex) {
        if (haystack.includes(t.titleLower)) {
          mentioned.push({ id: t.id, title: t.title, category: t.category });
          itemMentionCount.set(t.id, (itemMentionCount.get(t.id) ?? 0) + 1);
        }
      }
      return {
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        subject: r.subject,
        message: r.message,
        created_at: r.created_at,
        status: (r.status ?? "new") as InquiryStatus,
        quote_value: r.quote_value !== null && r.quote_value !== undefined ? Number(r.quote_value) : null,
        outcome_notes: r.outcome_notes,
        outcome_updated_at: r.outcome_updated_at,
        mentioned_items: mentioned.slice(0, 12),
      };
    });

    // KPIs ------------------------------------------------------------------
    const now = Date.now();
    const startThisWeek = now - 7 * DAY;
    const startLastWeek = now - 14 * DAY;
    const startThisMonth = now - 30 * DAY;
    const startLastMonth = now - 60 * DAY;

    let inquiries_this_week = 0;
    let inquiries_last_week = 0;
    let inquiries_this_month = 0;
    let inquiries_last_month = 0;
    let open_count = 0;
    let booked_count = 0;
    let booked_value_total = 0;
    let pipeline_value = 0;

    const daily = new Map<string, number>();
    for (let i = 29; i >= 0; i--) daily.set(ISO(new Date(now - i * DAY)), 0);

    for (const r of inquiriesEnriched) {
      const t = new Date(r.created_at).getTime();
      if (t >= startThisWeek) inquiries_this_week++;
      else if (t >= startLastWeek) inquiries_last_week++;
      if (t >= startThisMonth) inquiries_this_month++;
      else if (t >= startLastMonth) inquiries_last_month++;

      if (r.status === "new" || r.status === "quoted") open_count++;
      if (r.status === "booked") {
        booked_count++;
        if (r.quote_value) booked_value_total += r.quote_value;
      }
      if ((r.status === "new" || r.status === "quoted") && r.quote_value) {
        pipeline_value += r.quote_value;
      }
      const key = ISO(new Date(r.created_at));
      if (daily.has(key)) daily.set(key, (daily.get(key) ?? 0) + 1);
    }

    const kpis: InsightsKpis = {
      inquiries_this_week,
      inquiries_last_week,
      inquiries_this_month,
      inquiries_last_month,
      open_count,
      booked_count,
      booked_value_total,
      pipeline_value,
      daily: [...daily.entries()].map(([date, count]) => ({ date, count })),
    };

    // Top mentioned items ---------------------------------------------------
    const top_items: ItemDemand[] = [...itemMentionCount.entries()]
      .map(([id, count]) => {
        const t = titleIndex.find((x) => x.id === id);
        return t
          ? {
              id,
              title: t.title,
              category: t.category,
              mention_count: count,
              image_url: t.image,
            }
          : null;
      })
      .filter((x): x is ItemDemand => x !== null)
      .sort((a, b) => b.mention_count - a.mention_count)
      .slice(0, 12);

    // Dead stock — public, has imagery, never mentioned in any inquiry.
    const dead_stock: ItemDemand[] = products
      .filter(
        (p) =>
          p.publicReady &&
          p.imageCount > 0 &&
          !itemMentionCount.has(p.id),
      )
      .slice(0, 24)
      .map((p) => ({
        id: p.id,
        title: p.title,
        category: p.displayCategory ?? "uncategorized",
        mention_count: 0,
        image_url: p.primaryImage?.url ?? null,
      }));

    // Category demand -------------------------------------------------------
    const inventoryByCategory = new Map<string, number>();
    for (const p of products) {
      if (!p.publicReady) continue;
      const c = p.displayCategory ?? "uncategorized";
      inventoryByCategory.set(c, (inventoryByCategory.get(c) ?? 0) + 1);
    }
    const mentionsByCategory = new Map<string, number>();
    for (const [itemId, count] of itemMentionCount) {
      const t = titleIndex.find((x) => x.id === itemId);
      if (!t) continue;
      mentionsByCategory.set(t.category, (mentionsByCategory.get(t.category) ?? 0) + count);
    }
    const category_demand: CategoryDemand[] = [...inventoryByCategory.entries()]
      .map(([category, inventory_count]) => {
        const m = mentionsByCategory.get(category) ?? 0;
        return {
          category,
          inventory_count,
          inquiry_mentions: m,
          intensity: inventory_count ? (m / inventory_count) * 100 : 0,
        };
      })
      .sort((a, b) => b.intensity - a.intensity);

    return {
      kpis,
      inquiries: inquiriesEnriched.slice(0, 50),
      top_items,
      dead_stock,
      category_demand,
    };
  });

// Update an inquiry's outcome (status / quote / notes). Admin-only via RLS
// AND middleware — defense in depth.
const UpdateOutcomeSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "quoted", "booked", "lost", "ghosted"]),
  quote_value: z
    .number()
    .min(0)
    .max(10_000_000)
    .nullable()
    .optional(),
  outcome_notes: z.string().max(2000).nullable().optional(),
});

export const updateInquiryOutcome = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: unknown) => UpdateOutcomeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("inquiries")
      .update({
        status: data.status,
        quote_value: data.quote_value ?? null,
        outcome_notes: data.outcome_notes ?? null,
      })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });
