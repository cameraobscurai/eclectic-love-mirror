// Composed middleware: requireSupabaseAuth + has_role('admin') check.
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

    // has_role() is SECURITY DEFINER, so it sees user_roles regardless of RLS.
    const { data, error } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    if (error) {
      console.error("[requireAdmin] has_role rpc failed:", error);
      throw new Response("Forbidden", { status: 403 });
    }
    if (!data) {
      throw new Response("Forbidden: admin role required", { status: 403 });
    }

    return next();
  });
