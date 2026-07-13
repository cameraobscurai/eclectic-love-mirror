// Public client-facing style board view. Token in the URL is the only secret.
import { createFileRoute, notFound } from "@tanstack/react-router";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { getStyleBoardByToken, type PublicStyleBoard } from "@/lib/studio.functions";
import { BoardDeck } from "@/components/studio/board/BoardDeck";

export const Route = createFileRoute("/stylebrief/$token")({
  head: ({ loaderData }: { loaderData?: PublicStyleBoard }) => {
    const name = loaderData?.client_name?.trim();
    return {
      meta: [
        { title: name ? `Style Brief for ${name} · Eclectic Hive` : "Your Style Brief · Eclectic Hive" },
        { name: "robots", content: "noindex, nofollow" },
      ],
    };
  },
  loader: async ({ params }) => {
    // Harden the public share surface: no referrer leak of the token to
    // outbound links, no search-engine indexing at the HTTP layer.
    setResponseHeaders({
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
    });
    try {
      return (await getStyleBoardByToken({ data: { token: params.token } })) as PublicStyleBoard;
    } catch {
      throw notFound();
    }
  },

  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center bg-cream text-charcoal/60 text-[11px] uppercase tracking-[0.22em]">
      Board not found
    </div>
  ),
  errorComponent: () => (
    <div className="min-h-screen grid place-items-center bg-cream text-charcoal/60 text-[11px] uppercase tracking-[0.22em]">
      Unable to load board
    </div>
  ),
  component: PublicBoardPage,
});

function PublicBoardPage() {
  const board = Route.useLoaderData();
  // Show download button when ?download=1 in URL (admin/preview only).
  const preview =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("download");
  return <BoardDeck board={board} preview={preview} />;
}
