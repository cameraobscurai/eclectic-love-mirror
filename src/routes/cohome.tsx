import { createFileRoute } from "@tanstack/react-router";

// Legacy Squarespace home URL → apex.
export const Route = createFileRoute("/cohome")({
  server: {
    handlers: {
      GET: () =>
        new Response(null, { status: 301, headers: { Location: "/" } }),
    },
  },
});
