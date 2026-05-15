import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/careers")({
  server: {
    handlers: {
      GET: () =>
        new Response(null, { status: 301, headers: { Location: "/" } }),
    },
  },
});
