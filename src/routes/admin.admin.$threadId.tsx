// /admin/admin/$threadId — single ADMIN conversation.
// Loads messages from the DB and hands them to the chat window keyed by threadId.

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { getAdminThreadMessages } from "@/lib/admin-chat.functions";
import { AdminChatWindow } from "@/components/admin/admin-chat-window";

export const Route = createFileRoute("/admin/admin/$threadId")({
  ssr: false,
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const { data: rows, isLoading, error } = useQuery({
    queryKey: ["admin-thread-messages", threadId],
    queryFn: () => getAdminThreadMessages({ data: { threadId } }),
  });

  if (isLoading) return <div className="text-xs text-muted-foreground/60">Loading…</div>;
  if (error) return <div className="text-sm text-destructive">Failed to load: {error.message}</div>;

  const initial: UIMessage[] = (rows ?? [])
    .filter((r) => r.role === "user" || r.role === "assistant")
    .map((r) => ({
      id: r.id,
      role: r.role as "user" | "assistant",
      parts: Array.isArray(r.parts) ? r.parts : [],
    })) as UIMessage[];

  return (
    <AdminChatWindow
      key={threadId}
      threadId={threadId}
      initialMessages={initial}
    />
  );
}
