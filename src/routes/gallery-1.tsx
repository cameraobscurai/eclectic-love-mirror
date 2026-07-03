import { createFileRoute } from "@tanstack/react-router";

// Legacy Squarespace URL.
export const Route = createFileRoute("/gallery-1")({
  server: {
    handlers: {
      GET: () =>
        new Response(null, { status: 301, headers: { Location: "/gallery" } }),
    },
  },
});
