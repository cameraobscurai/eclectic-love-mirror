// ADMIN co-pilot — thread + message persistence server fns.
// All gated by requireAdmin. Uses the auth-scoped supabase client (RLS as user).

import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import { z } from "zod";

export interface AdminThread {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AdminMessageRow {
  id: string;
  thread_id: string;
  role: "user" | "assistant" | "system" | "tool";
  parts: any;
  created_at: string;
}

export const listAdminThreads = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<AdminThread[]> => {
    const { data, error } = await context.supabase
      .from("admin_threads")
      .select("id, title, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as AdminThread[];
  });

export const createAdminThread = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { title?: string }) =>
    z.object({ title: z.string().min(1).max(200).optional() }).parse(d),
  )
  .handler(async ({ data, context }): Promise<AdminThread> => {
    const { data: row, error } = await context.supabase
      .from("admin_threads")
      .insert({ user_id: context.userId, title: data.title ?? "New conversation" })
      .select("id, title, created_at, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return row as AdminThread;
  });

export const getAdminThreadMessages = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((d: { threadId: string }) =>
    z.object({ threadId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("admin_messages")
      .select("id, thread_id, role, parts, created_at")
      .eq("thread_id", data.threadId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as AdminMessageRow[];
  });

export const deleteAdminThread = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { threadId: string }) =>
    z.object({ threadId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("admin_threads")
      .delete()
      .eq("id", data.threadId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const renameAdminThread = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { threadId: string; title: string }) =>
    z.object({ threadId: z.string().uuid(), title: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("admin_threads")
      .update({ title: data.title })
      .eq("id", data.threadId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
