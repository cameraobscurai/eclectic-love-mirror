import { createFileRoute, Navigate } from "@tanstack/react-router";

// Legacy route — FAQ now lives at /contact#faq.
// Redirect happens at component-render time (not in beforeLoad) so that
// hover/intent preloads and speculation-rules prerenders don't throw inside
// the router's loadRouteMatch (which surfaces as a `_nonReactive` TypeError
// and blocks chunk warming for adjacent links).
export const Route = createFileRoute("/faq")({
  component: () => <Navigate to="/contact" hash="faq" replace />,
});
