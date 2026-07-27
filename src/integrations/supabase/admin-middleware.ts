// Composed middleware for server functions. Two flavors:
//   - requireAdmin          → admin only (team management, destructive ops)
//   - requireStaffOrAdmin   → admin OR staff (product editing, photos)
//
// Both validate the Supabase bearer token, then check role via user_roles.
// context.supabase is an RLS-respecting client acting as the user; context.userId is verified.
import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "./auth-middleware";

type AppRole = "admin" | "staff" | "user";

// Per-worker role cache. The user_roles lookup was costing ~1.5s on every
// admin serverFn call, serialized behind the token check — that alone made the
// inventory table feel like it hung. Roles change rarely; a 60s TTL keyed by
// user id is safe and removes the round-trip from every subsequent call.
const ROLE_TTL_MS = 60_000;
const roleCache = new Map<string, { roles: AppRole[]; expires: number }>();

async function loadRoles(
  supabase: { from: (t: "user_roles") => any },
  userId: string,
): Promise<AppRole[]> {
  const hit = roleCache.get(userId);
  if (hit && hit.expires > Date.now()) return hit.roles;

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) {
    console.error("[roleGate] role lookup failed:", error);
    throw new Response("Forbidden", { status: 403 });
  }
  const roles = ((data ?? []) as { role: AppRole }[]).map((r) => r.role);
  roleCache.set(userId, { roles, expires: Date.now() + ROLE_TTL_MS });
  return roles;
}

function makeRoleGate(allowed: readonly AppRole[]) {
  return createMiddleware({ type: "function" })
    .middleware([requireSupabaseAuth])
    .server(async ({ next, context }) => {
      const { supabase, userId } = context;

      const roles = await loadRoles(supabase as never, userId);
      const matched = roles.filter((r) => allowed.includes(r));
      if (matched.length === 0) {
        throw new Response(`Forbidden: ${allowed.join(" or ")} role required`, { status: 403 });
      }
      const role: AppRole = matched.includes("admin") ? "admin" : matched[0];

      return next({ context: { role } });
    });
}


export const requireAdmin = makeRoleGate(["admin"]);
export const requireStaffOrAdmin = makeRoleGate(["admin", "staff"]);
