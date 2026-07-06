// Browser-side admin route guards. Use inside `beforeLoad` on /admin* routes:
//
//   beforeLoad: ({ location }) => requireStaffOrRedirect(location.href),
//
// Two levels:
//   - requireStaffOrRedirect  → admin OR staff (product edits, photos, etc.)
//   - requireAdminOrRedirect  → admin only (team management, destructive ops)
//
// The /admin tree is `noindex`; server fns are gated by matching middleware
// (defense in depth).
import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

async function checkRoles(currentHref: string, roles: readonly string[]): Promise<void> {
  if (typeof window === "undefined") return;

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    throw redirect({ to: "/login", search: { redirect: currentHref } });
  }

  const { data: roleRows, error: roleErr } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .in("role", roles as string[]);

  if (roleErr || (roleRows ?? []).length === 0) {
    throw redirect({ to: "/login", search: { redirect: currentHref } });
  }
}

export function requireAdminOrRedirect(currentHref: string): Promise<void> {
  return checkRoles(currentHref, ["admin"]);
}

export function requireStaffOrRedirect(currentHref: string): Promise<void> {
  return checkRoles(currentHref, ["admin", "staff"]);
}
