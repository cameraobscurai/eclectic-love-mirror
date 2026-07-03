import { createFileRoute } from "@tanstack/react-router";

// Legacy Squarespace URL.
export const Route = createFileRoute("/ut-inventory")({
  server: {
    handlers: {
      GET: () =>
        new Response(null, { status: 301, headers: { Location: "/collection" } }),
    },
  },
});
