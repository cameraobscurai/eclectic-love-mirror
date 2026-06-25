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

export const Route = createFileRoute("/api/admin-render")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Auth: bearer + admin role.
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!token) return new Response("Unauthorized", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
        if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });
        const { data: roleRows } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", userData.user.id)
          .eq("role", "admin")
          .limit(1);
        if (!roleRows || roleRows.length === 0) {
          return new Response("Forbidden", { status: 403 });
        }

        const body = (await request.json()) as {
          refImageUrl?: string;
          preset?: string;
          model?: string;
          extraPrompt?: string;
          productTitle?: string;
        };

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
