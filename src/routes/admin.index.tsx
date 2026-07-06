/**
 * /admin (index) — BOH home, full-bleed. The layout in admin.tsx skips
 * AdminShell for this exact match. ssr: false for the same
 * localStorage-session reason as the layout.
 */
import { createFileRoute } from "@tanstack/react-router";
import { BohHome } from "@/components/admin/boh-home";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  // BOH zoom state lives in the URL so back/forward and reload restore it
  validateSearch: (s: Record<string, unknown>) => ({
    page: typeof s.page === "string" ? s.page : undefined,
  }),
  component: () => <BohHome />,
});
