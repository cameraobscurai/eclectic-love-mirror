// /admin/admin/$threadId — single ADMIN conversation.
// Loads messages from the DB and hands them to the chat window keyed by threadId.

import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { getAdminThreadMessages } from "@/lib/admin-chat.functions";
import { AdminChatWindow } from "@/components/admin/admin-chat-window";

const threadMessagesOptions = (threadId: string) =>
  queryOptions({
    queryKey: ["admin-thread-messages", threadId],
    queryFn: () => getAdminThreadMessages({ data: { threadId } }),
  });

export const Route = createFileRoute("/admin/admin/$threadId")({
  loader: ({ params }) => getAdminThreadMessages({ data: { threadId: params.threadId } }),
  errorComponent: ({ error }) => (
    <div className="text-sm text-destructive">Failed to load thread: {error.message}</div>
  ),
  notFoundComponent: () => <div className="text-sm">Thread not found.</div>,
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const { data: rows } = useSuspenseQuery(threadMessagesOptions(threadId));

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
