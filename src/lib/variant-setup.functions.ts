// Server functions for /admin/variants — the "turn a family into a
// configurator" queue. Reads every family with its members, and writes the
// option axis + variant labels in one shot.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireStaffOrAdmin } from "@/integrations/supabase/admin-middleware";

export type SetupMember = {
  id: string;
  title: string;
  variant_label: string | null;
  family_position: number | null;
  images: string[];
};

export type SetupFamily = {
  id: string;
  title: string;
  slug: string;
  option_name: string | null;
  members: SetupMember[];
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const listFamilySetup = createServerFn({ method: "POST" })
  .middleware([requireStaffOrAdmin])
  .handler(async (): Promise<SetupFamily[]> => {
    const db = await admin();
    const [{ data: fams, error: fErr }, { data: rows, error: mErr }] = await Promise.all([
      db.from("product_families").select("id, title, slug, option_name"),
      db
        .from("inventory_items")
        .select("id, title, variant_label, family_position, images, family_id")
        .not("family_id", "is", null),
    ]);
    if (fErr) throw new Response(fErr.message, { status: 500 });
    if (mErr) throw new Response(mErr.message, { status: 500 });

    const byFamily = new Map<string, SetupMember[]>();
    for (const r of (rows ?? []) as unknown as (SetupMember & { family_id: string })[]) {
      const list = byFamily.get(r.family_id) ?? [];
      list.push({
        id: r.id,
        title: r.title ?? "",
        variant_label: r.variant_label ?? null,
        family_position: r.family_position ?? null,
        images: Array.isArray(r.images) ? r.images : [],
      });
      byFamily.set(r.family_id, list);
    }

    const out: SetupFamily[] = [];
    for (const f of (fams ?? []) as unknown as SetupFamily[]) {
      const members = (byFamily.get(f.id) ?? []).sort((a, b) => {
        const ap = a.family_position ?? 9e9;
        const bp = b.family_position ?? 9e9;
        return ap !== bp ? ap - bp : a.title.localeCompare(b.title);
      });
      if (members.length < 2) continue;
      out.push({ ...f, members });
    }
    // Biggest families first — most public impact per decision.
    out.sort((a, b) => b.members.length - a.members.length);
    return out;
  });

/** Accept a whole family at once: axis + one label per member. */
export const applyFamilySetup = createServerFn({ method: "POST" })
  .middleware([requireStaffOrAdmin])
  .inputValidator((d: unknown) =>
    z
      .object({
        familyId: z.string().uuid(),
        optionName: z.string().trim().min(1).max(40),
        labels: z
          .array(z.object({ id: z.string().uuid(), label: z.string().trim().min(1).max(60) }))
          .min(2)
          .max(200),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();

    const { data: owned, error: oErr } = await db
      .from("inventory_items")
      .select("id")
      .eq("family_id", data.familyId);
    if (oErr) throw new Response(oErr.message, { status: 500 });
    const ids = new Set((owned ?? []).map((r) => r.id as string));
    if (data.labels.some((l) => !ids.has(l.id))) {
      throw new Response("Those pieces are not all in this collection.", { status: 400 });
    }

    const seen = new Set<string>();
    for (const l of data.labels) {
      const key = l.label.toLowerCase();
      if (seen.has(key)) {
        throw new Response(`Two pieces have the same label: "${l.label}".`, { status: 400 });
      }
      seen.add(key);
    }

    const { error: fErr } = await db
      .from("product_families")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ option_name: data.optionName, updated_at: new Date().toISOString() } as any)
      .eq("id", data.familyId);
    if (fErr) throw new Response(fErr.message, { status: 500 });

    for (let i = 0; i < data.labels.length; i++) {
      const l = data.labels[i];
      const { error } = await db
        .from("inventory_items")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ variant_label: l.label, family_position: i + 1 } as any)
        .eq("id", l.id);
      if (error) throw new Response(error.message, { status: 500 });
    }
    return { ok: true, count: data.labels.length };
  });

/** Undo: clears the axis so the family goes back to a plain gallery. */
export const clearFamilySetup = createServerFn({ method: "POST" })
  .middleware([requireStaffOrAdmin])
  .inputValidator((d: unknown) => z.object({ familyId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const { error } = await db
      .from("product_families")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ option_name: null, updated_at: new Date().toISOString() } as any)
      .eq("id", data.familyId);
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true };
  });
