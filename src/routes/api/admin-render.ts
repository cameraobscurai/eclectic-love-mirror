// POST /api/admin-render — streams an AI-generated product render.
// Body: { rmsId, productTitle, refImageUrl, preset, model, prompt }
// Returns: SSE pass-through from Lovable AI Gateway (image_generation.* events).
// Admin-gated.

import { createFileRoute } from "@tanstack/react-router";

const PRESET_PROMPTS: Record<string, string> = {
  white_room:
    "Place the product in a clean, fully white-walled studio room with a polished concrete floor. Soft north-facing daylight from camera left, gentle wrap shadow, no other props. Editorial product photography, eye-level 35mm, shallow but honest depth of field. The product silhouette, materials, color, and proportions must match the reference exactly — do not redesign it.",
  editorial_scene:
    "Place the product within a warm, lived-in California editorial interior — washed oak floor, hand-troweled plaster wall, a single linen drape, soft afternoon sun. Tonal palette of bone, oat, ash, and walnut. Magazine cover composition, 50mm, calm and considered. The product must remain identical to the reference in silhouette, materials, color, and proportion — do not redesign it.",
  tablescape:
    "Stage the product as part of a refined dinner tablescape on hand-loomed linen, with subtle ceramics, beeswax tapers, and seasonal florals at the edges of frame. Late golden-hour light, overhead three-quarter angle. The product remains hero, identical to the reference. Editorial restraint, no clutter.",
  cutout:
    "Isolate the product on a pure white background as a clean studio cutout. Soft contact shadow only. The product silhouette, materials, color, and proportion must match the reference exactly.",
};

const MODEL_DEFAULT = "google/gemini-3-pro-image";

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

function safeFilename(input: string) {
  return input.replace(/[^a-z0-9._-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "render.png";
}

export const Route = createFileRoute("/api/admin-render")({
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
      PUT: async ({ request }) => {
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
      POST: async ({ request }) => {
        const admin = await requireAdminFromRequest(request);
        if (!admin) return new Response("Unauthorized", { status: 401 });

        const contentType = request.headers.get("content-type") ?? "";
        if (contentType.includes("multipart/form-data")) {
          try {
            const form = await request.formData();
            const file = form.get("file");
            if (!(file instanceof Blob)) return new Response("Missing image file", { status: 400 });

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
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return new Response(message || "Save failed", { status: 500 });
          }
        }

        const body = (await request.json()) as {
          intent?: string;
          id?: string;
          refImageUrl?: string;
          preset?: string;
          model?: string;
          extraPrompt?: string;
          productTitle?: string;
        };

        if (body.intent === "download") {
          if (!body.id) return new Response("Missing id", { status: 400 });
          const { data: row, error: rowErr } = await admin.supabaseAdmin
            .from("studio_renders")
            .select("id, rms_id, preset, storage_path")
            .eq("id", body.id)
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
        }

        if (!body.refImageUrl) return new Response("Missing refImageUrl", { status: 400 });

        const presetText = PRESET_PROMPTS[body.preset ?? "white_room"] ?? PRESET_PROMPTS.white_room;
        const extra = body.extraPrompt?.trim() ? `\n\nAdditional direction: ${body.extraPrompt.trim()}` : "";
        const titleLine = body.productTitle?.trim()
          ? `Reference product: "${body.productTitle.trim()}".`
          : "";
        const prompt = `${titleLine}\n${presetText}${extra}\n\nUse the attached photo as the visual reference for the product itself.`.trim();

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const model = body.model || MODEL_DEFAULT;

        // Gemini image models use chat-completions image shape.
        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            modalities: ["image", "text"],
            stream: true,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  { type: "image_url", image_url: { url: body.refImageUrl } },
                ],
              },
            ],
          }),
        });
        if (!upstream.ok || !upstream.body) {
          const errText = await upstream.text().catch(() => "");
          return new Response(errText || `Upstream ${upstream.status}`, { status: upstream.status });
        }
        return new Response(upstream.body, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        });
      },
    },
  },
});
