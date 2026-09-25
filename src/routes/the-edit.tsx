import { createFileRoute } from "@tanstack/react-router";

// Unlisted owner-preview gallery. Static document lives at /the-edit/index.html.
// Not linked from nav, footer, or sitemap. Query strings preserved.
export const Route = createFileRoute("/the-edit")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const url = new URL(request.url);
        // Cache buster: unique v= per deploy so browsers/CDN never serve a stale copy.
        const params = new URLSearchParams(url.search);
        params.set("v", "20260925b");
        return new Response(null, {
          status: 302,
          headers: {
            Location: `/the-edit/index.html?${params.toString()}`,
            "Cache-Control": "no-store, max-age=0",
            "X-Robots-Tag": "noindex, nofollow",
          },
        });
      },
    },
  },
});
