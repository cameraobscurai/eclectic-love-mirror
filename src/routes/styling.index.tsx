import { createFileRoute } from "@tanstack/react-router";

// Legacy Squarespace bare category → collection with parent filter.
// Parent id validated against PARENT_ORDER in src/lib/collection-parents.ts.
export const Route = createFileRoute("/styling/")({
  server: {
    handlers: {
      GET: () =>
        new Response(null, {
          status: 301,
          headers: { Location: "/collection?group=styling" },
        }),
    },
  },
});
