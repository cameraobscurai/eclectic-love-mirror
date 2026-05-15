import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/inventory")({
  component: () => <Navigate to="/collection" replace />,
});
