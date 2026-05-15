import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/event-gallery")({
  component: () => <Navigate to="/gallery" replace />,
});
