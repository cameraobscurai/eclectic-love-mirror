// Public client-facing style board view. Token in the URL is the only secret.
import { createFileRoute, notFound } from "@tanstack/react-router";
import { getStyleBoardByToken, type PublicStyleBoard } from "@/lib/studio.functions";

export const Route = createFileRoute("/studio/$token")({
  head: () => ({
    meta: [
      { title: "Your Style Board · Eclectic Hive" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
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
  const palette = (board.palette ?? []) as Array<{ hex?: string; name?: string }>;
  const tones = (board.tones ?? {}) as Record<string, unknown>;
  const insights = (board.insights ?? []) as Array<{ title?: string; description?: string } | string>;

  const toneEntries = Object.entries(tones)
    .filter(([, v]) => typeof v === "number" || typeof v === "string")
    .slice(0, 6);

  return (
    <div className="min-h-screen bg-cream text-charcoal">
      <header className="px-6 lg:px-12 pt-16 pb-10 border-b border-charcoal/10">
        <p className="text-[10px] uppercase tracking-[0.32em] text-charcoal/45">Eclectic Hive · Style Board</p>
        <h1 className="mt-3 font-display text-4xl lg:text-5xl uppercase tracking-[0.04em]">
          For {board.client_name}
        </h1>
        {board.curator_notes && (
          <p className="mt-6 max-w-2xl text-[14px] leading-relaxed font-sans normal-case text-charcoal/80 whitespace-pre-wrap">
            {board.curator_notes}
          </p>
        )}
        {palette.length > 0 && (
          <div className="mt-8 flex gap-1">
            {palette.slice(0, 8).map((c, i) => (
              <span
                key={i}
                className="h-10 flex-1 max-w-[60px]"
                style={{ background: c.hex ?? "#ccc" }}
                aria-hidden
              />
            ))}
          </div>
        )}
      </header>

      <main className="px-6 lg:px-12 py-10">
        {(insights.length > 0 || toneEntries.length > 0) && (
          <section className="mb-12 grid gap-8 md:grid-cols-2">
            {insights.length > 0 && (
              <div>
                <h2 className="text-[10px] uppercase tracking-[0.3em] text-charcoal/45 mb-4">Direction</h2>
                <ul className="space-y-3">
                  {insights.slice(0, 6).map((ins, i) => {
                    const title = typeof ins === "string" ? ins : (ins.title ?? "");
                    const desc = typeof ins === "string" ? "" : (ins.description ?? "");
                    return (
                      <li key={i} className="text-[13px] font-sans normal-case text-charcoal/80">
                        {title && <span className="uppercase tracking-[0.18em] text-[11px] text-charcoal/70 mr-2">{title}</span>}
                        {desc}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {toneEntries.length > 0 && (
              <div>
                <h2 className="text-[10px] uppercase tracking-[0.3em] text-charcoal/45 mb-4">Tone</h2>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12px] font-sans normal-case">
                  {toneEntries.map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-charcoal/10 py-1">
                      <dt className="uppercase tracking-[0.16em] text-[10px] text-charcoal/60">{k}</dt>
                      <dd className="text-charcoal/85">{typeof v === "number" ? v.toFixed(2) : String(v)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </section>
        )}

        {board.inspo.length > 0 && (
          <section className="mb-12">
            <h2 className="text-[10px] uppercase tracking-[0.3em] text-charcoal/45 mb-4">Inspiration</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {board.inspo.map((i: PublicStyleBoard["inspo"][number]) => (
                <figure key={i.id} className="aspect-[4/3] bg-charcoal/5 overflow-hidden">
                  <img src={i.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                </figure>
              ))}
            </div>
          </section>
        )}

        {board.pinned.length > 0 && (
          <section>
            <h2 className="text-[10px] uppercase tracking-[0.3em] text-charcoal/45 mb-4">Selected pieces</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
              {board.pinned.map((p: PublicStyleBoard["pinned"][number]) => (
                <article key={p.id}>
                  <div className="aspect-[4/5] bg-charcoal/5 overflow-hidden">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.title} loading="lazy" className="w-full h-full object-contain" />
                    ) : null}
                  </div>
                  <h3 className="mt-3 font-display text-lg normal-case">{p.title}</h3>
                  {p.note && (
                    <p className="mt-1 text-[13px] leading-relaxed font-sans normal-case text-charcoal/70">
                      {p.note}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-20 pt-8 border-t border-charcoal/10 text-[10px] uppercase tracking-[0.28em] text-charcoal/40">
          Eclectic Hive
        </footer>
      </main>
    </div>
  );
}
