import { createFileRoute, Navigate } from "@tanstack/react-router";

// Legacy Squarespace slug (still listed on Google Business Profile).
// Redirect to the live collection page.
export const Route = createFileRoute("/colorado-1")({
  component: () => <Navigate to="/collection" replace />,
});
