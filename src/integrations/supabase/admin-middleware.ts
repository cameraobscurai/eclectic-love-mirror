// Composed middleware for server functions. Two flavors:
//   - requireAdmin          → admin only (team management, destructive ops)
//   - requireStaffOrAdmin   → admin OR staff (product editing, photos)
//
// Both validate the Supabase bearer token, then check role via user_roles.
// context.supabase is an RLS-respecting client acting as the user; context.userId is verified.
import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "./auth-middleware";

type AppRole = "admin" | "staff" | "user";

function makeRoleGate(allowed: readonly AppRole[]) {
  return createMiddleware({ type: "function" })
    .middleware([requireSupabaseAuth])
    .server(async ({ next, context }) => {
      const { supabase, userId } = context;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .in("role", allowed)
        .limit(1);

      if (error) {
        console.error("[roleGate] role lookup failed:", error);
        throw new Response("Forbidden", { status: 403 });
      }
      if ((data ?? []).length === 0) {
        throw new Response(`Forbidden: ${allowed.join(" or ")} role required`, { status: 403 });
      }

      return next();
    });
}

export const requireAdmin = makeRoleGate(["admin"]);
export const requireStaffOrAdmin = makeRoleGate(["admin", "staff"]);
