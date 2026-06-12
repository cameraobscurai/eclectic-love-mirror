import { createFileRoute } from "@tanstack/react-router";

// Legacy Squarespace URL — preserved for SEO continuity from stale Google
// results. Redirects to /atelier (the capability surface where team/crew
// information now lives).
export const Route = createFileRoute("/event-crew")({
  server: {
    handlers: {
      GET: () =>
        new Response(null, { status: 301, headers: { Location: "/atelier" } }),
    },
  },
});
