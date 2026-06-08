// ADMIN co-pilot — chat window for a single thread.
// Threaded + DB-backed. The active threadId is the React key; messages are
// hydrated from the loader and posted to /api/admin-chat with the bearer
// attached by the browser supabase session.

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  threadId: string;
  initialMessages: UIMessage[];
}

export function AdminChatWindow({ threadId, initialMessages }: Props) {
  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/admin-chat",
        prepareSendMessagesRequest: async ({ messages, body }) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token ?? "";
          return {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: { ...body, threadId, messages },
          };
        },
      }),
  );

  const { messages, sendMessage, status, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
  });

  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId, status]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendMessage({ text });
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-1 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-sm text-muted-foreground/70 max-w-md">
            ADMIN is online. Read-only for now — ask about inventory counts, inquiry status, image health, or talk through what to build next.
          </div>
        )}
        {messages.map((m) => {
          const text = m.parts
            .map((p) => (p.type === "text" ? p.text : ""))
            .join("");
          return (
            <div
              key={m.id}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[80%] rounded-md bg-foreground text-background px-3 py-2 text-sm whitespace-pre-wrap"
                  : "mr-auto max-w-[85%] text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed"
              }
            >
              {text}
            </div>
          );
        })}
        {status === "submitted" && (
          <div className="text-xs text-muted-foreground/60">ADMIN is thinking…</div>
        )}
        {error && (
          <div className="text-xs text-destructive">Error: {error.message}</div>
        )}
      </div>

      <form onSubmit={onSubmit} className="border-t border-border/60 pt-3">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void onSubmit(e as unknown as React.FormEvent);
            }
          }}
          placeholder="Ask ADMIN…"
          rows={2}
          className="w-full resize-none rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/30"
          disabled={isLoading}
        />
        <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
          <span>Enter to send · Shift+Enter for newline</span>
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded border border-foreground/40 px-3 py-1 hover:bg-foreground hover:text-background disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
