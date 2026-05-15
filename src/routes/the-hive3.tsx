import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/the-hive3")({
  component: () => <Navigate to="/" replace />,
});
