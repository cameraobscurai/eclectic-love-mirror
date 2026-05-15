import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/the-hive")({
  component: () => <Navigate to="/" replace />,
});
