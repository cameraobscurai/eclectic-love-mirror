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

/** One row of variant-setup history: the state BEFORE a change. */
export type VariantSnapshot = {
  id: string;
  batch_id: string;
  family_id: string;
  family_title: string;
  action: "apply" | "clear" | "rollback";
  prev_option_name: string | null;
  prev_members: { id: string; variant_label: string | null; family_position: number | null }[];
  rolled_back_at: string | null;
  created_at: string;
};

/**
 * Record the CURRENT state of a family before we overwrite it. Every write in
 * this module calls this first, so any change — or any batch of changes made
 * in one sitting, grouped by `batchId` — can be restored byte-for-byte.
 * Snapshotting must never block the edit: a logging failure is reported but
 * the caller decides.
 */
async function snapshotFamily(
  db: Awaited<ReturnType<typeof admin>>,
  familyId: string,
  batchId: string,
  action: "apply" | "clear" | "rollback",
  actorId: string | null,
) {
  const [{ data: fam }, { data: members }] = await Promise.all([
    db.from("product_families").select("title, option_name").eq("id", familyId).maybeSingle(),
    db
      .from("inventory_items")
      .select("id, variant_label, family_position")
      .eq("family_id", familyId),
  ]);
  const { error } = await db.from("variant_config_snapshots").insert({
    batch_id: batchId,
    family_id: familyId,
    family_title: (fam as { title?: string } | null)?.title ?? "",
    action,
    prev_option_name: (fam as { option_name?: string | null } | null)?.option_name ?? null,
    prev_members: members ?? [],
    created_by: actorId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  if (error) throw new Response(`Couldn't record undo history: ${error.message}`, { status: 500 });
}

const batchInput = z.string().uuid();

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
        batchId: batchInput,
        optionName: z.string().trim().min(1).max(40),
        labels: z
          .array(z.object({ id: z.string().uuid(), label: z.string().trim().min(1).max(60) }))
          .min(2)
          .max(200),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
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

    // Undo point, written before the first mutation.
    await snapshotFamily(db, data.familyId, data.batchId, "apply", context.userId ?? null);

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
  .inputValidator((d: unknown) =>
    z.object({ familyId: z.string().uuid(), batchId: batchInput }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    await snapshotFamily(db, data.familyId, data.batchId, "clear", context.userId ?? null);
    const { error } = await db
      .from("product_families")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ option_name: null, updated_at: new Date().toISOString() } as any)
      .eq("id", data.familyId);
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true };
  });

/** Recent history, newest first, grouped client-side by batch. */
export const listVariantHistory = createServerFn({ method: "POST" })
  .middleware([requireStaffOrAdmin])
  .handler(async (): Promise<VariantSnapshot[]> => {
    const db = await admin();
    const { data, error } = await db
      .from("variant_config_snapshots")
      .select(
        "id, batch_id, family_id, family_title, action, prev_option_name, prev_members, rolled_back_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Response(error.message, { status: 500 });
    return (data ?? []) as unknown as VariantSnapshot[];
  });

/**
 * One-click rollback. Restores every family touched in `batchId` to the state
 * captured before that batch ran — axis, labels and order together.
 *
 * Safety properties that keep live PDPs intact:
 *  - Only the three variant fields are written. Photos, taxonomy, titles and
 *    everything else are never touched.
 *  - When a family was edited several times inside one batch, the OLDEST
 *    snapshot wins, so we land on the state from before the batch started.
 *  - Rows that have since left the family are skipped; a rollback can't
 *    resurrect a stale family_id.
 *  - The rollback itself is snapshotted first, so it can be undone too.
 */
export const rollbackVariantBatch = createServerFn({ method: "POST" })
  .middleware([requireStaffOrAdmin])
  .inputValidator((d: unknown) =>
    z.object({ batchId: batchInput, undoBatchId: batchInput }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    const actor = context.userId ?? null;

    const { data: rows, error } = await db
      .from("variant_config_snapshots")
      .select("id, family_id, prev_option_name, prev_members, rolled_back_at")
      .eq("batch_id", data.batchId)
      .order("created_at", { ascending: true });
    if (error) throw new Response(error.message, { status: 500 });
    const snaps = (rows ?? []) as unknown as VariantSnapshot[];
    if (snaps.length === 0) throw new Response("Nothing to undo in that batch.", { status: 404 });

    // Oldest snapshot per family = the pre-batch state.
    const earliest = new Map<string, VariantSnapshot>();
    for (const s of snaps) if (!earliest.has(s.family_id)) earliest.set(s.family_id, s);

    let families = 0;
    let items = 0;
    for (const snap of earliest.values()) {
      await snapshotFamily(db, snap.family_id, data.undoBatchId, "rollback", actor);

      const { error: fErr } = await db
        .from("product_families")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ option_name: snap.prev_option_name, updated_at: new Date().toISOString() } as any)
        .eq("id", snap.family_id);
      if (fErr) throw new Response(fErr.message, { status: 500 });
      families++;

      for (const m of snap.prev_members ?? []) {
        const { error: iErr } = await db
          .from("inventory_items")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .update({ variant_label: m.variant_label, family_position: m.family_position } as any)
          .eq("id", m.id)
          .eq("family_id", snap.family_id);
        if (iErr) throw new Response(iErr.message, { status: 500 });
        items++;
      }
    }

    const { error: mErr } = await db
      .from("variant_config_snapshots")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ rolled_back_at: new Date().toISOString() } as any)
      .eq("batch_id", data.batchId)
      .is("rolled_back_at", null);
    if (mErr) throw new Response(mErr.message, { status: 500 });

    return { ok: true, families, items };
  });
