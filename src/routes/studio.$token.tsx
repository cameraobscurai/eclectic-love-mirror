// Public client-facing style board view. Token in the URL is the only secret.
import { createFileRoute, notFound } from "@tanstack/react-router";
import { getStyleBoardByToken, type PublicStyleBoard } from "@/lib/studio.functions";
import { BoardDeck } from "@/components/studio/board/BoardDeck";

export const Route = createFileRoute("/studio/$token")({
  head: ({ loaderData }) => {
    const name = loaderData?.client_name?.trim();
    return {
      meta: [
        { title: name ? `Style Board for ${name} · Eclectic Hive` : "Your Style Board · Eclectic Hive" },
        { name: "robots", content: "noindex, nofollow" },
      ],
    };
  },
  loader: async ({ params }) => {
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
