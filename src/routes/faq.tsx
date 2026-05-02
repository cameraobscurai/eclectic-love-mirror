import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy route — FAQ now lives at /contact#faq.
// Kept as a redirect so cached/external links resolve cleanly instead of 404.
export const Route = createFileRoute("/faq")({
  beforeLoad: () => {
    throw redirect({ to: "/contact", hash: "faq" });
  },
  component: () => null,
});
