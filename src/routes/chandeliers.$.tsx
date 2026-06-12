import { createFileRoute } from "@tanstack/react-router";

// Legacy Squarespace URL — /chandeliers/<product-slug> → /collection?view=<product-slug>
export const Route = createFileRoute("/chandeliers/$")({
  server: {
    handlers: {
      GET: ({ params }) => {
        const slug = (params._splat ?? "").split("/").pop() ?? "";
        const location = slug ? `/collection?view=${encodeURIComponent(slug)}` : "/collection";
        return new Response(null, { status: 301, headers: { Location: location } });
      },
    },
  },
});
