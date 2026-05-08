import { createFileRoute, Navigate } from "@tanstack/react-router";

// Legacy route — process content now lives on the Atelier page.
// Redirect at component-render time (not beforeLoad) so preload/prerender
// can't throw inside loadRouteMatch. See faq.tsx for the same pattern.
export const Route = createFileRoute("/process")({
  component: () => <Navigate to="/atelier" replace />,
});
