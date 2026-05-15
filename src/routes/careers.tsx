import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/careers")({
  component: () => <Navigate to="/" replace />,
});
