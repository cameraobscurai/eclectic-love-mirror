// ADMIN co-pilot — streaming chat endpoint.
// POST { threadId, messages } → AI SDK UI message stream.
// Gated server-side: validates Supabase bearer + has_role('admin'),
// verifies thread ownership, persists user + assistant messages.

import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `You are ADMIN, the in-house co-pilot for Eclectic Hive — an editorial events-rental archive.

Voice: relaxed-internal, blunt, no hedging. No marketing copy. No emojis. Short sentences. You are a tool talking to the owner, not a brand surface.

Phase 1 scope: you are read-only and conversational. You do not write to the database, you do not edit files, you do not send emails. If asked to perform a write, say which tier of authority it would require and that those tools come online in later phases.

Brand register you should keep in mind when reasoning about copy or design: Prada, Casa Carta, Saol Display, Aesence. Editorial restraint, image texture, ALL CAPS site-wide.

Be useful. When you don't know something, say "I don't know" — don't guess.`;

export const Route = createFileRoute("/api/admin-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // 1. Auth — validate bearer + admin role server-side.
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!token) return new Response("Unauthorized", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
        if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });
        const userId = userData.user.id;

        const { data: roleRows } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .limit(1);
        if (!roleRows || roleRows.length === 0) {
          return new Response("Forbidden", { status: 403 });
        }

        // 2. Parse body.
        const body = (await request.json()) as {
          threadId?: string;
          messages?: UIMessage[];
        };
        if (!body.threadId || !Array.isArray(body.messages)) {
          return new Response("Bad request", { status: 400 });
        }

        // 3. Verify thread ownership.
        const { data: thread } = await supabaseAdmin
          .from("admin_threads")
          .select("id, user_id")
          .eq("id", body.threadId)
          .single();
        if (!thread || thread.user_id !== userId) {
          return new Response("Forbidden", { status: 403 });
        }

        // 4. Persist the latest user message (idempotent on ai_sdk_message_id).
        const lastUser = [...body.messages].reverse().find((m) => m.role === "user");
        if (lastUser) {
          const { data: existing } = await supabaseAdmin
            .from("admin_messages")
            .select("id")
            .eq("thread_id", body.threadId)
            .eq("ai_sdk_message_id", lastUser.id)
            .limit(1);
          if (!existing || existing.length === 0) {
            await supabaseAdmin.from("admin_messages").insert({
              thread_id: body.threadId,
              role: "user",
              parts: lastUser.parts as unknown as never,
              ai_sdk_message_id: lastUser.id,
            });
          }
        }

        // 5. Stream from Lovable AI Gateway.
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        const threadId = body.threadId;

        const gateway = createLovableAiGatewayProvider(apiKey);
        const model = gateway("google/gemini-2.5-flash");

        const result = streamText({
          model,
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(body.messages),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: body.messages,
          onFinish: async ({ messages }) => {
            const assistant = messages[messages.length - 1];
            if (!assistant || assistant.role !== "assistant") return;
            await supabaseAdmin.from("admin_messages").insert({
              thread_id: threadId,
              role: "assistant",
              parts: assistant.parts as unknown as never,
              ai_sdk_message_id: assistant.id,
            });
            await supabaseAdmin
              .from("admin_threads")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", threadId);
          },
        });
      },
    },
  },
});
