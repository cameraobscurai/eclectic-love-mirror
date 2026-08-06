import type { GalleryCredits as Credits } from "@/content/gallery-projects";

// Editorial credit block — photographer / florist / venue / caterer / rentals.
// Renders nothing when no credits are supplied.
export function GalleryCreditsBlock({ credits }: { credits?: Credits }) {
  if (!credits) return null;
  const rows: { label: string; name: string }[] = [
    { label: "Photography", name: credits.photographer ?? "" },
    { label: "Florals", name: credits.florist ?? "" },
    { label: "Venue", name: credits.venue ?? "" },
    { label: "Catering", name: credits.caterer ?? "" },
    { label: "Rentals", name: credits.rentals ?? "" },
    ...(credits.additional ?? []),
  ].filter((r) => r.name.trim().length > 0);

  if (rows.length === 0) return null;

  return (
    <div className="mt-8 pt-6 border-t border-cream/10">
      <p className="text-[9px] uppercase tracking-[0.36em] text-cream/35">Credits</p>
      <dl className="mt-4 space-y-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline gap-4">
            <dt className="w-[86px] shrink-0 text-[9px] uppercase tracking-[0.28em] text-cream/35">
              {r.label}
            </dt>
            <dd className="text-[10px] uppercase tracking-[0.22em] text-cream/70">
              {r.name}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
