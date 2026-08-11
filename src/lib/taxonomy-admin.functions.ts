// Taxonomy Studio server functions (Task E).
//
// Adrienne's declared taxonomy is the law of the site; these are the writes
// that let her change it without emailing a spreadsheet.
//
// Invariants:
//  - The (collection_slug, category_slug) pair is revalidated against
//    taxonomy_collections / taxonomy_categories server-side on every write.
//    The UI's constrained dropdown is convenience, not security.
//  - Every write stamps taxonomy_review = { source:'human', reviewed:true,
//    reviewed_by, reviewed_at } and is audited.
//  - CONFIRM never changes slugs. Agreement is its own gesture.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireStaffOrAdmin } from "@/integrations/supabase/admin-middleware";
import { audit } from "@/server/_audit.server";

const slug = z.string().min(1).max(64).regex(/^[a-z0-9-]+$/);

// ---------------------------------------------------------------------------
// Reference tree
// ---------------------------------------------------------------------------

export const listTaxonomyTree = createServerFn({ method: "GET" })
  .middleware([requireStaffOrAdmin])
  .handler(async () => {
    const [collections, categories] = await Promise.all([
      supabaseAdmin
        .from("taxonomy_collections")
        .select("slug, label, sort_order")
        .order("sort_order"),
      supabaseAdmin
        .from("taxonomy_categories")
        .select("slug, collection_slug, label, sort_order")
        .order("sort_order"),
    ]);
    if (collections.error) throw collections.error;
    if (categories.error) throw categories.error;
    return {
      collections: collections.data ?? [],
      categories: categories.data ?? [],
    };
  });

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

export interface TaxonomyRow {
  id: string;
  rms_id: string | null;
  title: string;
  slug: string | null;
  cover: string | null;
  collection_slug: string | null;
  category_slug: string | null;
  review: {
    source?: string;
    confidence?: string;
    reviewed?: boolean;
    needs_owner?: boolean;
    reviewed_by?: string;
    reviewed_at?: string;
    note?: string;
  } | null;
}

export const listTaxonomyRows = createServerFn({ method: "GET" })
  .middleware([requireStaffOrAdmin])
  .handler(async (): Promise<{ rows: TaxonomyRow[] }> => {
    const PAGE = 1000;
    const rows: TaxonomyRow[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabaseAdmin
        .from("inventory_items")
        .select(
          "id, rms_id, title, slug, images, cover_framed_url, collection_slug, category_slug, taxonomy_review",
        )
        .neq("status", "draft")
        .range(from, from + PAGE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const r of data) {
        rows.push({
          id: r.id,
          rms_id: r.rms_id,
          title: r.title,
          slug: r.slug,
          cover: r.cover_framed_url ?? (r.images as string[] | null)?.[0] ?? null,
          collection_slug: r.collection_slug,
          category_slug: r.category_slug,
          review: (r.taxonomy_review as TaxonomyRow["review"]) ?? null,
        });
      }
      if (data.length < PAGE) break;
    }
    rows.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
    return { rows };
  });

// ---------------------------------------------------------------------------
// Assign — set both slugs, revalidated against the reference tables
// ---------------------------------------------------------------------------

const assignInput = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  collection_slug: slug,
  category_slug: slug,
});

export const assignTaxonomy = createServerFn({ method: "POST" })
  .middleware([requireStaffOrAdmin])
  .inputValidator((d: unknown) => assignInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: pair, error: pairErr } = await supabaseAdmin
      .from("taxonomy_categories")
      .select("slug, collection_slug")
      .eq("slug", data.category_slug)
      .eq("collection_slug", data.collection_slug)
      .maybeSingle();
    if (pairErr) throw pairErr;
    if (!pair) {
      throw new Error(
        `INVALID_PAIR: ${data.collection_slug}/${data.category_slug} is not in the declared taxonomy`,
      );
    }

    const review = {
      source: "human",
      confidence: "high",
      reviewed: true,
      needs_owner: false,
      reviewed_by: context.userId,
      reviewed_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from("inventory_items")
      .update({
        collection_slug: data.collection_slug,
        category_slug: data.category_slug,
        taxonomy_review: review,
      })
      .in("id", data.ids);
    if (error) throw error;

    for (const id of data.ids) {
      void audit({
        actorId: context.userId,
        entity: "inventory_items",
        entityId: id,
        action: "taxonomy_assign",
        after: { collection_slug: data.collection_slug, category_slug: data.category_slug },
      });
    }
    return { updated: data.ids.length };
  });

// ---------------------------------------------------------------------------
// Confirm — agreement without a re-selection. Slugs untouched.
// ---------------------------------------------------------------------------

const idsInput = z.object({ ids: z.array(z.string().uuid()).min(1).max(1000) });

export const confirmTaxonomy = createServerFn({ method: "POST" })
  .middleware([requireStaffOrAdmin])
  .inputValidator((d: unknown) => idsInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error: readErr } = await supabaseAdmin
      .from("inventory_items")
      .select("id, collection_slug, category_slug, taxonomy_review")
      .in("id", data.ids);
    if (readErr) throw readErr;

    const stampedAt = new Date().toISOString();
    let confirmed = 0;
    let skipped = 0;

    for (const row of rows ?? []) {
      const review = (row.taxonomy_review ?? {}) as Record<string, unknown>;
      // Never confirm a row that is unassigned or flagged for the owner.
      if (!row.collection_slug || !row.category_slug || review.needs_owner === true) {
        skipped++;
        continue;
      }
      const { error } = await supabaseAdmin
        .from("inventory_items")
        .update({
          taxonomy_review: {
            ...review,
            source: "human",
            reviewed: true,
            needs_owner: false,
            reviewed_by: context.userId,
            reviewed_at: stampedAt,
          },
        })
        .eq("id", row.id);
      if (error) throw error;
      confirmed++;
      void audit({
        actorId: context.userId,
        entity: "inventory_items",
        entityId: row.id,
        action: "taxonomy_confirm",
        after: { collection_slug: row.collection_slug, category_slug: row.category_slug },
      });
    }
    return { confirmed, skipped };
  });

// ---------------------------------------------------------------------------
// Ask Adrienne — park a row for an owner ruling
// ---------------------------------------------------------------------------

export const flagForOwner = createServerFn({ method: "POST" })
  .middleware([requireStaffOrAdmin])
  .inputValidator((d: unknown) => idsInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error: readErr } = await supabaseAdmin
      .from("inventory_items")
      .select("id, taxonomy_review")
      .in("id", data.ids);
    if (readErr) throw readErr;

    for (const row of rows ?? []) {
      const review = (row.taxonomy_review ?? {}) as Record<string, unknown>;
      const { error } = await supabaseAdmin
        .from("inventory_items")
        .update({
          taxonomy_review: { ...review, needs_owner: true, reviewed: false },
        })
        .eq("id", row.id);
      if (error) throw error;
      void audit({
        actorId: context.userId,
        entity: "inventory_items",
        entityId: row.id,
        action: "taxonomy_flag_owner",
      });
    }
    return { flagged: (rows ?? []).length };
  });
