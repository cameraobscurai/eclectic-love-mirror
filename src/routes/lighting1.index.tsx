import { createFileRoute } from "@tanstack/react-router";

// Legacy Squarespace bare category → collection with parent filter.
export const Route = createFileRoute("/lighting1/")({
  server: {
    handlers: {
      GET: () =>
        new Response(null, {
          status: 301,
          headers: { Location: "/collection?group=lighting" },
        }),
    },
  },
});
