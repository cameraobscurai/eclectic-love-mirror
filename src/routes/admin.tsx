/**
 * /admin — layout route.
 *
 * Bare Outlet at exactly /admin (BOH owns its chrome); AdminShell for every
 * subroute. The old dashboard body lives at /admin/dashboard, not merged
 * into /admin/insights (which is a different populated route).
 *
 * ssr: false is REQUIRED — the supabase session lives in localStorage, so
 * the guard can only run client-side. Without it the admin HTML ships to
 * unauthenticated browsers before the redirect fires.
 *
 * beforeLoad is UX only — real authorization is requireAdmin on every
 * server function.
 */
import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminOrRedirect } from "@/lib/admin-guard";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: ({ location }) => requireAdminOrRedirect(location.href),
  head: () => ({
    meta: [
      { title: "Admin · Eclectic Hive" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  // Compare pathname directly — useMatchRoute({ to: "/admin" }) is false at
  // "/admin/" because the active match there is the index child, not the
  // layout. Trailing-slash tolerant.
  const { pathname } = useLocation();
  const isBohIndex = pathname === "/admin" || pathname === "/admin/";
  if (isBohIndex) return <Outlet />;
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
