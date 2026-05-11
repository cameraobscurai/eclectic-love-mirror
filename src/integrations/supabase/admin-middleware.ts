// Composed middleware: requireSupabaseAuth + admin role check.
// Use on every server function that should be admin-only. After this
// middleware runs, context.supabase is an RLS-respecting client acting as
// the admin user, and context.userId is verified.
//
// If the caller is unauthenticated → 401. Authenticated but not an admin → 403.
import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "./auth-middleware";

export const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { supabase, userId } = context;

    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .limit(1);

    if (error) {
      console.error("[requireAdmin] admin role lookup failed:", error);
      throw new Response("Forbidden", { status: 403 });
    }
    if ((data ?? []).length === 0) {
      throw new Response("Forbidden: admin role required", { status: 403 });
    }

    return next();
  });
