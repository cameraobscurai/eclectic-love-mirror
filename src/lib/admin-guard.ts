// Browser-side admin route guard. Use inside `beforeLoad` on /admin* routes:
//
//   beforeLoad: ({ location }) => requireAdminOrRedirect(location.href),
//
// Checks Supabase session client-side (it'll already be hydrated from
// localStorage on revisit; on first paint we await getUser()), then verifies
// the admin role via the SECURITY DEFINER `has_role` rpc. Bounces to /login
// with a `redirect` search param so we can return after sign-in.
import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export async function requireAdminOrRedirect(currentHref: string): Promise<void> {
  // Skip on SSR — beforeLoad runs on both, but Supabase auth state lives in
  // the browser. The /admin tree is `noindex` and not pre-rendered; a brief
  // server-side pass-through is fine because the server functions themselves
  // are gated by requireAdmin middleware (defense in depth).
  if (typeof window === "undefined") return;

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    throw redirect({ to: "/login", search: { redirect: currentHref } });
  }

  const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "admin",
  });
  if (roleErr || !isAdmin) {
    throw redirect({ to: "/login", search: { redirect: currentHref } });
  }
}
