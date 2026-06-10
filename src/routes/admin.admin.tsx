// /admin/admin — ADMIN co-pilot index. Loads thread list, creates a
// fresh thread on demand, and renders the sidebar + active-thread Outlet.

import { useState } from "react";
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  createAdminThread,
  deleteAdminThread,
  listAdminThreads,
  type AdminThread,
} from "@/lib/admin-chat.functions";
import { Plus, Trash2 } from "lucide-react";

import { requireAdminOrRedirect } from "@/lib/admin-guard";

export const Route = createFileRoute("/admin/admin")({
  beforeLoad: ({ location }) => requireAdminOrRedirect(location.href),
  component: AdminCoPilotLayout,
});

function AdminCoPilotLayout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const params = useParams({ strict: false }) as { threadId?: string };

  const threadsQ = useQuery<AdminThread[]>({
    queryKey: ["admin-threads"],
    queryFn: () => listAdminThreads(),
  });

  const createMut = useMutation({
    mutationFn: () => createAdminThread({ data: {} }),
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ["admin-threads"] });
      navigate({ to: "/admin/admin/$threadId", params: { threadId: t.id } });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (threadId: string) =>
      deleteAdminThread({ data: { threadId } }),
    onSuccess: (_, threadId) => {
      qc.invalidateQueries({ queryKey: ["admin-threads"] });
      if (params.threadId === threadId) navigate({ to: "/admin/admin" });
    },
  });

  return (
    <div className="grid grid-cols-[260px_1fr] gap-6 min-h-[calc(100vh-10rem)]">
      <aside className="border-r border-border/60 pr-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/80">
            ADMIN
          </h2>
          <button
            type="button"
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending}
            className="rounded border border-border/60 p-1 hover:bg-muted/40 disabled:opacity-40"
            aria-label="New conversation"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <nav className="space-y-1">
          {threadsQ.data?.length === 0 && (
            <p className="text-xs text-muted-foreground/60">
              No conversations. Start one.
            </p>
          )}
          {threadsQ.data?.map((t) => {
            const active = params.threadId === t.id;
            return (
              <div
                key={t.id}
                className={`group flex items-center gap-1 rounded px-2 py-1.5 text-xs ${
                  active ? "bg-foreground text-background" : "hover:bg-muted/40"
                }`}
              >
                <Link
                  to="/admin/admin/$threadId"
                  params={{ threadId: t.id }}
                  className="flex-1 truncate"
                >
                  {t.title}
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    if (confirm("Delete this conversation?"))
                      deleteMut.mutate(t.id);
                  }}
                  className={`opacity-0 group-hover:opacity-60 hover:opacity-100 ${
                    active ? "text-background" : ""
                  }`}
                  aria-label="Delete conversation"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </nav>
      </aside>

      <section className="min-w-0">
        {params.threadId ? (
          <Outlet />
        ) : (
          <EmptyState onStart={() => createMut.mutate()} pending={createMut.isPending} />
        )}
      </section>
    </div>
  );
}

function EmptyState({ onStart, pending }: { onStart: () => void; pending: boolean }) {
  return (
    <div className="flex h-full flex-col items-start justify-center max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-wide">ADMIN</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Phase 1: read-only and conversational. Tools come online in later phases.
        </p>
      </div>
      <button
        type="button"
        onClick={onStart}
        disabled={pending}
        className="rounded border border-foreground/60 px-4 py-2 text-xs uppercase tracking-[0.18em] hover:bg-foreground hover:text-background disabled:opacity-40"
      >
        Start a conversation
      </button>
    </div>
  );
}
