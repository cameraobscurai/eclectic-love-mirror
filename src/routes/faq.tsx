import { createFileRoute, Navigate } from "@tanstack/react-router";

// Legacy route — FAQ now lives at /atelier#working-with-the-hive.
// Redirect happens at component-render time (not in beforeLoad) so that
// hover/intent preloads and speculation-rules prerenders don't throw inside
// the router's loadRouteMatch (which surfaces as a `_nonReactive` TypeError
// and blocks chunk warming for adjacent links).
export const Route = createFileRoute("/faq")({
  // Redirect stub still ships a document — give it a title and keep it out of
  // the index so crawlers don't record an untitled page.
  head: () => ({
    meta: [{ title: "FAQ — Eclectic Hive" }, { name: "robots", content: "noindex, follow" }],
  }),
  component: () => <Navigate to="/atelier" hash="working-with-the-hive" replace />,
});
