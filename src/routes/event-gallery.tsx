import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/event-gallery")({
  server: {
    handlers: {
      GET: () =>
        new Response(null, { status: 301, headers: { Location: "/gallery" } }),
    },
  },
});
