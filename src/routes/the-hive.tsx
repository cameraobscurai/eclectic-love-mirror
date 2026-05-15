import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/the-hive")({
  server: {
    handlers: {
      GET: () =>
        new Response(null, { status: 301, headers: { Location: "/" } }),
    },
  },
});
