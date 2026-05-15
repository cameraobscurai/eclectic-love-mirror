import { createFileRoute, Navigate } from "@tanstack/react-router";

// Legacy slug — "About" maps to /atelier (capability page).
export const Route = createFileRoute("/about")({
  component: () => <Navigate to="/atelier" replace />,
});
