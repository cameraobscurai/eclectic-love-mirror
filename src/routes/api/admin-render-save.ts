// POST /api/admin-render-save — saves the final generated PNG to the studio
// library. Uses FormData so large image payloads do not go through TanStack
// server-function JSON/RPC.

import { createFileRoute } from "@tanstack/react-router";

async function requireAdminFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData.user) return null;

  const { data: roleRows } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .limit(1);

  if (!roleRows || roleRows.length === 0) return null;
  return { supabaseAdmin, userId: userData.user.id };
}

export const Route = createFileRoute("/api/admin-render-save")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const admin = await requireAdminFromRequest(request);
        if (!admin) return new Response("Unauthorized", { status: 401 });

        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof File)) return new Response("Missing image file", { status: 400 });

        const rmsIdRaw = String(form.get("rmsId") ?? "").trim();
        const productTitleRaw = String(form.get("productTitle") ?? "").trim();
        const preset = String(form.get("preset") ?? "render").trim() || "render";
        const model = String(form.get("model") ?? "").trim();
        const prompt = String(form.get("prompt") ?? "");

        const rmsId = rmsIdRaw || null;
        const productTitle = productTitleRaw || null;
        const bytes = new Uint8Array(await file.arrayBuffer());
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const slug = (rmsId ?? "render").replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
        const safePreset = preset.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
        const path = `${slug}/${stamp}-${safePreset}.png`;

        const { error: upErr } = await admin.supabaseAdmin.storage
          .from("studio-renders")
          .upload(path, bytes, { contentType: "image/png", upsert: false });
        if (upErr) return new Response(upErr.message, { status: 500 });

        const { data: row, error: insErr } = await admin.supabaseAdmin
          .from("studio_renders")
          .insert({
            rms_id: rmsId,
            product_title: productTitle,
            preset,
            model,
            prompt,
            storage_path: path,
            created_by: admin.userId,
          })
          .select("id, storage_path")
          .single();

        if (insErr || !row) return new Response(insErr?.message || "Save failed", { status: 500 });

        return Response.json({ id: row.id, storagePath: row.storage_path });
      },
    },
  },
});