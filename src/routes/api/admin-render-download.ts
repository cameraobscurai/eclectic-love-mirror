// GET /api/admin-render-download?id=... — streams a saved render back as a
// first-party attachment. Avoids cross-origin signed URL download failures.

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
  return { supabaseAdmin };
}

function safeFilename(input: string) {
  return input.replace(/[^a-z0-9._-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "render.png";
}

export const Route = createFileRoute("/api/admin-render-download")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const admin = await requireAdminFromRequest(request);
        if (!admin) return new Response("Unauthorized", { status: 401 });

        const id = new URL(request.url).searchParams.get("id");
        if (!id) return new Response("Missing id", { status: 400 });

        const { data: row, error: rowErr } = await admin.supabaseAdmin
          .from("studio_renders")
          .select("id, rms_id, preset, storage_path")
          .eq("id", id)
          .single();
        if (rowErr || !row) return new Response("Render not found", { status: 404 });

        const { data: file, error: dlErr } = await admin.supabaseAdmin.storage
          .from("studio-renders")
          .download(row.storage_path);
        if (dlErr || !file) return new Response(dlErr?.message || "Download failed", { status: 500 });

        const filename = safeFilename(`${row.rms_id ?? "render"}-${row.preset}-${row.id.slice(0, 8)}.png`);
        return new Response(file, {
          headers: {
            "Content-Type": "image/png",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "private, max-age=0, no-store",
          },
        });
      },
    },
  },
});