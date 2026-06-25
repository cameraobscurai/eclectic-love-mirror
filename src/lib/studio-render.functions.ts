// Studio Render — admin server fns: list inventory pickables, save streamed render,
// list past renders, sign storage URL, publish render to product images[].

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";

export interface RenderPickable {
  rmsId: string;
  title: string;
  category: string | null;
  primaryImage: string | null;
}

export const listRenderPickables = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<RenderPickable[]> => {
    const { data, error } = await supabaseAdmin
      .from("inventory_items")
      .select("rms_id, title, category, images")
      .eq("public_ready", true)
      .order("title", { ascending: true })
      .limit(2000);
    if (error) throw error;
    return (data ?? [])
      .filter((r) => Boolean(r.rms_id))
      .map((r): RenderPickable => {
        const imgs = Array.isArray(r.images) ? (r.images as unknown[]) : [];
        const first = imgs[0];
        const url =
          typeof first === "string"
            ? first
            : first && typeof first === "object" && "url" in (first as Record<string, unknown>)
            ? String((first as Record<string, unknown>).url ?? "")
            : null;
        return {
          rmsId: r.rms_id as string,
          title: r.title ?? (r.rms_id as string),
          category: r.category ?? null,
          primaryImage: url || null,
        };
      });
  });

const SaveInput = z.object({
  rmsId: z.string().nullable(),
  productTitle: z.string().nullable(),
  preset: z.string(),
  model: z.string(),
  prompt: z.string(),
  b64: z.string(),
});

export interface SavedRender {
  id: string;
  storagePath: string;
  signedUrl: string;
}

export const saveRender = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => SaveInput.parse(d))
  .handler(async ({ data, context }): Promise<SavedRender> => {
    const ctx = context as { userId?: string };
    const bytes = Uint8Array.from(atob(data.b64), (c) => c.charCodeAt(0));
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const slug = (data.rmsId ?? "render").replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
    const path = `${slug}/${stamp}-${data.preset}.png`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("studio-renders")
      .upload(path, bytes, { contentType: "image/png", upsert: false });
    if (upErr) throw upErr;

    const { data: row, error: insErr } = await supabaseAdmin
      .from("studio_renders")
      .insert({
        rms_id: data.rmsId,
        product_title: data.productTitle,
        preset: data.preset,
        model: data.model,
        prompt: data.prompt,
        storage_path: path,
        created_by: ctx.userId ?? null,
      })
      .select("id, storage_path")
      .single();
    if (insErr) throw insErr;

    const { data: signed } = await supabaseAdmin.storage
      .from("studio-renders")
      .createSignedUrl(path, 60 * 60 * 24 * 7);

    return { id: row.id, storagePath: row.storage_path, signedUrl: signed?.signedUrl ?? "" };
  });

export interface RenderHistoryItem {
  id: string;
  rmsId: string | null;
  productTitle: string | null;
  preset: string;
  model: string;
  status: string;
  createdAt: string;
  signedUrl: string;
}

export const listRenders = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ rmsId: z.string().nullable().optional() }).parse(d))
  .handler(async ({ data }): Promise<RenderHistoryItem[]> => {
    let q = supabaseAdmin
      .from("studio_renders")
      .select("id, rms_id, product_title, preset, model, status, created_at, storage_path")
      .order("created_at", { ascending: false })
      .limit(60);
    if (data.rmsId) q = q.eq("rms_id", data.rmsId);
    const { data: rows, error } = await q;
    if (error) throw error;

    const out: RenderHistoryItem[] = [];
    for (const r of rows ?? []) {
      const { data: signed } = await supabaseAdmin.storage
        .from("studio-renders")
        .createSignedUrl(r.storage_path, 60 * 60 * 6);
      out.push({
        id: r.id,
        rmsId: r.rms_id,
        productTitle: r.product_title,
        preset: r.preset,
        model: r.model,
        status: r.status,
        createdAt: r.created_at,
        signedUrl: signed?.signedUrl ?? "",
      });
    }
    return out;
  });

export const discardRender = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("studio_renders")
      .select("storage_path")
      .eq("id", data.id)
      .single();
    if (row?.storage_path) {
      await supabaseAdmin.storage.from("studio-renders").remove([row.storage_path]);
    }
    await supabaseAdmin.from("studio_renders").delete().eq("id", data.id);
    return { ok: true };
  });

// Publish: copy render into the public squarespace-mirror bucket and append to
// the product's images[]. Marks the source render as 'published'.
export const publishRender = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: row, error: rowErr } = await supabaseAdmin
      .from("studio_renders")
      .select("id, rms_id, storage_path, preset")
      .eq("id", data.id)
      .single();
    if (rowErr || !row) throw rowErr ?? new Error("Render not found");
    if (!row.rms_id) throw new Error("Render has no rms_id");

    const { data: file, error: dlErr } = await supabaseAdmin.storage
      .from("studio-renders")
      .download(row.storage_path);
    if (dlErr || !file) throw dlErr ?? new Error("Download failed");
    const buf = new Uint8Array(await file.arrayBuffer());

    const stamp = Date.now();
    const destPath = `studio/${row.rms_id}/${stamp}-${row.preset}.png`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("squarespace-mirror")
      .upload(destPath, buf, { contentType: "image/png", upsert: false });
    if (upErr) throw upErr;

    const { data: pub } = supabaseAdmin.storage.from("squarespace-mirror").getPublicUrl(destPath);
    const publicUrl = pub.publicUrl;

    const { data: product } = await supabaseAdmin
      .from("inventory_items")
      .select("images")
      .eq("rms_id", row.rms_id)
      .single();
    const existing = Array.isArray(product?.images) ? (product!.images as unknown[]) : [];
    const next = [...existing, { url: publicUrl, source: "studio", preset: row.preset }];
    const { error: updErr } = await supabaseAdmin
      .from("inventory_items")
      .update({ images: next })
      .eq("rms_id", row.rms_id);
    if (updErr) throw updErr;

    await supabaseAdmin
      .from("studio_renders")
      .update({ status: "published" })
      .eq("id", data.id);

    return { ok: true, publicUrl };
  });
