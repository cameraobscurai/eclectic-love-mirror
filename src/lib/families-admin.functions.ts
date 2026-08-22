// Family board server functions — writable variant configurator.
//
// Reads/writes public.product_families + the family_* columns on
// inventory_items. RLS on product_families is admin-only, so writes go
// through the service client AFTER requireStaffOrAdmin has verified the
// caller (same pattern as photos-admin.functions.ts).
//
// The variant_cover_url pointer is validated in Postgres
// (inventory_items_validate_variant_cover): the pinned photo must be one of
// that row's own images. We surface that error verbatim.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireStaffOrAdmin } from "@/integrations/supabase/admin-middleware";

export type FamilyMember = {
  id: string;
  rms_id: string | null;
  title: string;
  variant_label: string | null;
  family_position: number | null;
  variant_cover_url: string | null;
  images: string[];
};

export type FamilyBoard = {
  family: {
    id: string;
    title: string;
    slug: string;
    option_name: string | null;
    lead_rms_id: string | null;
  };
  members: FamilyMember[];
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const MEMBER_COLS = "id, rms_id, title, variant_label, family_position, variant_cover_url, images";

function sortMembers(rows: FamilyMember[]): FamilyMember[] {
  return rows.slice().sort((a, b) => {
    const ap = a.family_position ?? 9e9;
    const bp = b.family_position ?? 9e9;
    if (ap !== bp) return ap - bp;
    return (a.title ?? "").localeCompare(b.title ?? "");
  });
}

/** Family board for the item currently open in the drawer. Null when the
 *  piece is a standalone product. */
export const getFamilyForItem = createServerFn({ method: "POST" })
  .middleware([requireStaffOrAdmin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<FamilyBoard | null> => {
    const db = await admin();
    const { data: item, error } = await db
      .from("inventory_items")
      .select("family_id")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Response(error.message, { status: 500 });
    const familyId = (item?.family_id as string | null) ?? null;
    if (!familyId) return null;

    const [{ data: fam, error: fErr }, { data: members, error: mErr }] = await Promise.all([
      db
        .from("product_families")
        .select("id, title, slug, option_name, lead_rms_id")
        .eq("id", familyId)
        .maybeSingle(),
      db.from("inventory_items").select(MEMBER_COLS).eq("family_id", familyId),
    ]);
    if (fErr) throw new Response(fErr.message, { status: 500 });
    if (mErr) throw new Response(mErr.message, { status: 500 });
    if (!fam) return null;

    return {
      family: fam as FamilyBoard["family"],
      members: sortMembers(
        ((members ?? []) as unknown as FamilyMember[]).map((m) => ({
          ...m,
          images: Array.isArray(m.images) ? m.images : [],
        })),
      ),
    };
  });

/** Configurator axis label ("Size", "Finish") + which row supplies the
 *  landing image. */
export const updateFamily = createServerFn({ method: "POST" })
  .middleware([requireStaffOrAdmin])
  .inputValidator((d: unknown) =>
    z
      .object({
        familyId: z.string().uuid(),
        optionName: z.string().trim().max(40).nullable().optional(),
        leadRmsId: z.string().trim().max(64).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const patch: Record<string, unknown> = {};
    if ("optionName" in data) patch.option_name = data.optionName || null;
    if ("leadRmsId" in data) patch.lead_rms_id = data.leadRmsId || null;
    if (Object.keys(patch).length === 0) {
      throw new Response("Nothing to change.", { status: 400 });
    }
    patch.updated_at = new Date().toISOString();

    const db = await admin();
    const { error } = await db
      .from("product_families")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(patch as any)
      .eq("id", data.familyId);
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true };
  });

/** Per-variant label + pinned photo. `variantCoverUrl: null` = back to AUTO. */
export const updateVariant = createServerFn({ method: "POST" })
  .middleware([requireStaffOrAdmin])
  .inputValidator((d: unknown) =>
    z
      .object({
        itemId: z.string().uuid(),
        variantLabel: z.string().trim().max(60).nullable().optional(),
        variantCoverUrl: z.string().trim().max(600).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const patch: Record<string, unknown> = {};
    if ("variantLabel" in data) patch.variant_label = data.variantLabel || null;
    if ("variantCoverUrl" in data) patch.variant_cover_url = data.variantCoverUrl || null;
    if (Object.keys(patch).length === 0) {
      throw new Response("Nothing to change.", { status: 400 });
    }

    const db = await admin();
    const { data: row, error } = await db
      .from("inventory_items")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(patch as any)
      .eq("id", data.itemId)
      .select(MEMBER_COLS)
      .single();
    if (error) {
      // Trigger message is already plain English.
      throw new Response(error.message, { status: 400 });
    }
    return row as unknown as FamilyMember;
  });

/** Variant display order inside the family. Positions are rewritten 1..n. */
export const reorderVariants = createServerFn({ method: "POST" })
  .middleware([requireStaffOrAdmin])
  .inputValidator((d: unknown) =>
    z
      .object({
        familyId: z.string().uuid(),
        itemIds: z.array(z.string().uuid()).min(1).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    // Guard: every id must belong to this family, or a bad payload could
    // renumber someone else's variants.
    const { data: rows, error: rErr } = await db
      .from("inventory_items")
      .select("id")
      .eq("family_id", data.familyId);
    if (rErr) throw new Response(rErr.message, { status: 500 });
    const owned = new Set((rows ?? []).map((r) => r.id as string));
    if (data.itemIds.some((id) => !owned.has(id))) {
      throw new Response("Those pieces are not all in this collection.", { status: 400 });
    }

    for (let i = 0; i < data.itemIds.length; i++) {
      const { error } = await db
        .from("inventory_items")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ family_position: i + 1 } as any)
        .eq("id", data.itemIds[i]);
      if (error) throw new Response(error.message, { status: 500 });
    }
    return { ok: true, count: data.itemIds.length };
  });
