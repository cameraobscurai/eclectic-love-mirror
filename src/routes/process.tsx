import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy route — process content now lives on the Atelier page.
// Kept as a redirect so cached/external links resolve cleanly instead of 404.
export const Route = createFileRoute("/process")({
  beforeLoad: () => {
    throw redirect({ to: "/atelier" });
  },
  component: () => null,
});
