import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/colorado-1")({
  server: {
    handlers: {
      GET: () =>
        new Response(null, { status: 301, headers: { Location: "/collection" } }),
    },
  },
});
