import { createFileRoute, Navigate } from "@tanstack/react-router";

// Typo/duplicate slug from the GBP listing.
export const Route = createFileRoute("/the-hive3")({
  component: () => <Navigate to="/atelier" replace />,
});
