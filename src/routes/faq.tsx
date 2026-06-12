import { createFileRoute, Navigate } from "@tanstack/react-router";

// Legacy route — FAQ now lives at /atelier#working-with-the-hive.
// Redirect happens at component-render time (not in beforeLoad) so that
// hover/intent preloads and speculation-rules prerenders don't throw inside
// the router's loadRouteMatch (which surfaces as a `_nonReactive` TypeError
// and blocks chunk warming for adjacent links).
export const Route = createFileRoute("/faq")({
  component: () => <Navigate to="/atelier" hash="working-with-the-hive" replace />,
});

