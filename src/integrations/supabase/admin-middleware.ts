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
        .in("role", allowed as readonly AppRole[] as never);

      if (error) {
        console.error("[roleGate] role lookup failed:", error);
        throw new Response("Forbidden", { status: 403 });
      }
      const matched = (data ?? []).map((r) => r.role as AppRole);
      if (matched.length === 0) {
        throw new Response(`Forbidden: ${allowed.join(" or ")} role required`, { status: 403 });
      }
      const role: AppRole = matched.includes("admin") ? "admin" : matched[0];

      return next({ context: { role } });
    });
}

export const requireAdmin = makeRoleGate(["admin"]);
export const requireStaffOrAdmin = makeRoleGate(["admin", "staff"]);
