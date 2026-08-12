/**
 * /admin (index) — redirects to COLLECTION.
 *
 * COLLECTION (/admin/photos) is the daily home: every piece in one grid,
 * cross-checkable at a glance. The BOH tile home still lives at
 * /admin/dashboard and is linked from the sidebar.
 *
 * ssr: false for the same localStorage-session reason as the layout.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/admin/photos", search: {} });
  },
});
