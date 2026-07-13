// Public client-facing style board view. Token in the URL is the only secret.
import { createFileRoute, notFound } from "@tanstack/react-router";
import { getStyleBoardByToken, type PublicStyleBoard } from "@/lib/studio.functions";
import { BoardDeck } from "@/components/studio/board/BoardDeck";

export const Route = createFileRoute("/stylebrief/$token")({
  head: ({ loaderData }: { loaderData?: PublicStyleBoard }) => {
    const name = loaderData?.client_name?.trim();
    return {
      meta: [
        { title: name ? `Style Brief for ${name} · Eclectic Hive` : "Your Style Brief · Eclectic Hive" },
        { name: "robots", content: "noindex, nofollow" },
        { name: "referrer", content: "no-referrer" },
      ],
    };
  },
  loader: async ({ params }) => {
    // Defense-in-depth: <meta name="referrer"> + <meta name="robots"> above
    // prevent referrer leaks and search indexing without needing a
    // server-only setResponseHeaders call (which cannot be imported into a
    // route module — it pulls @tanstack/react-start/server into the client
    // bundle).
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
