import { createFileRoute, Navigate } from "@tanstack/react-router";

// Legacy Squarespace slug. No careers page exists — send to contact.
export const Route = createFileRoute("/careers")({
  component: () => <Navigate to="/contact" replace />,
});
