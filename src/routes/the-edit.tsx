import { createFileRoute } from "@tanstack/react-router";

// Unlisted owner-preview gallery. Static document lives at /the-edit/index.html.
// Not linked from nav, footer, or sitemap. Query strings preserved.
export const Route = createFileRoute("/the-edit")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const url = new URL(request.url);
        return new Response(null, {
          status: 302,
          headers: {
            Location: `/the-edit/index.html${url.search}`,
            "X-Robots-Tag": "noindex, nofollow",
          },
        });
      },
    },
  },
});
