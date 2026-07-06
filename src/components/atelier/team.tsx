import { useMemo } from "react";
import { MediaAperture } from "@/components/media-aperture";
import { teamPhotoUrl, renderUrl, renderSrcSet } from "@/lib/storage-image";

// ---------------------------------------------------------------------------
// Atelier — THE HUMANS module
//
// Real staff module. NOT a paragraph. NOT decoration.
//
// Rendering rules:
// - Real entry, no image     → portrait aperture + name + role.
// - Image present, no name   → DO NOT render publicly (gated below).
// - Image present + name     → portrait + name + role; image must also have
//                              `approvedForWeb: true` to surface.
//
// Never: fake bios, stock portraits, silhouettes, "photo pending" placards,
// dashed upload boxes, developer gray blocks. Empty image slots use the
// MediaAperture frame — owner-approved waiting state, not a placeholder.
// ---------------------------------------------------------------------------

export interface TeamMemberImage {
  src: string;
  alt: string;
  credit?: string;
  /** Owner-approved for public web. False/undefined → portrait aperture only. */
  approvedForWeb: boolean;
}

export interface TeamMember {
  name: string;
  role: string;
  image?: TeamMemberImage;
  /**
   * Per-member visual tweaks — applied via Tailwind arbitrary selectors
   * on the wrapping <figure>. Used while we wait for replacement source
   * files (T6/T7/T8). Remove the override when fresh photos land.
   */
  imageClassName?: string;
}

// Helper: build an approved portrait entry from a storage filename.
const portrait = (filename: string, name: string): TeamMemberImage => ({
  src: teamPhotoUrl(filename),
  alt: `Portrait of ${name}`,
  approvedForWeb: true,
});

/**
 * Real staff roster. Portraits are native 2:3 — the aperture below matches
 * source ratio so faces are never cropped. No per-member reframes needed.
 */
export const TEAM: TeamMember[] = [
  { name: "Jill Livingston", role: "Founder · Creative Director", image: portrait("Jill.jpg", "Jill Livingston") },
  { name: "Annie Ohman", role: "Director of Company Operations", image: portrait("Annie.jpg", "Annie Ohman") },
  { name: "Amanda Ferguson", role: "Senior Designer", image: portrait("Amanda.jpg", "Amanda Ferguson") },
  { name: "Erin Purnell", role: "Associate Designer", image: portrait("Erin.jpg", "Erin Purnell") },
  { name: "Adrienne Moon", role: "Purchasing & Inventory Specialist", image: portrait("Adrienne.jpg", "Adrienne Moon") },
  { name: "Cat Moore", role: "Brand & Marketing", image: portrait("Cat.jpg", "Cat Moore") },
  { name: "Stephen Proud", role: "Warehouse & Fleet Specialist", image: portrait("Stephen.jpg", "Stephen Proud") },
  { name: "Judy Morales", role: "Human Resources", image: portrait("Judy.jpg", "Judy Morales") },
  { name: "Regina Mennig", role: "Accounting & Business Manager", image: portrait("Regina.jpg", "Regina Mennig") },
];

export function AtelierTeam() {
  // Public-render gate: a member must have a real name + role.
  const visibleMembers = useMemo(
    () => TEAM.filter((m) => m.name.trim().length > 0 && m.role.trim().length > 0),
    [],
  );

  const principal = visibleMembers.find((m) => m.name === "Jill Livingston");
  const staff = visibleMembers.filter((m) => m.name !== "Jill Livingston");

  return (
    <div>
      {/* ------------------------------------------------------------------
          Principal + team grid
          Left column pins Jill as the atelier anchor. Right column carries
          the section statement and the remaining team in a 4×2 grid so no
          single portrait dangles on its own row.
          ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-16">
        {/* Sticky principal card */}
        <aside className="lg:col-span-3">
          <div className="lg:sticky lg:top-24 space-y-5">
            {principal && (
              <>
                <div className="aspect-[2/3] bg-cream overflow-hidden">
                  <MediaAperture
                    ratio="2/3"
                    src={
                      principal.image?.approvedForWeb
                        ? renderUrl(principal.image.src, { width: 720, quality: 60 })
                        : undefined
                    }
                    srcSet={
                      principal.image?.approvedForWeb
                        ? renderSrcSet(principal.image.src, [360, 540, 720, 1080], 60)
                        : undefined
                    }
                    alt={principal.image?.approvedForWeb ? principal.image.alt : `Portrait slot for ${principal.name}`}
                    sizes="(min-width: 1024px) 20vw, 46vw"
                    lazy={false}
                    fetchPriority="high"
                    prefetchMargin="2000px"
                    className={principal.imageClassName}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-charcoal/50">
                    Principal
                  </p>
                  <h3 className="font-display text-2xl md:text-3xl text-charcoal leading-tight">
                    {principal.name}
                  </h3>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-charcoal/55">
                    {principal.role}
                  </p>
                </div>
              </>
            )}
          </div>
        </aside>

        {/* Right column: heading + staff grid */}
        <div className="lg:col-span-9">
          <header className="mb-12 md:mb-16 lg:mb-20">
            <h2
              className="font-display text-charcoal leading-[1.05]"
              style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)" }}
            >
              ARTISTS, DESIGNERS, CRAFTSMEN
            </h2>
            <p className="mt-4 max-w-2xl text-[12px] uppercase tracking-[0.18em] leading-[1.8] text-charcoal/65">
              Our team moves across disciplines with intention and a shared approach. We are the atelier.
            </p>
          </header>

          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 md:gap-x-8 gap-y-10 md:gap-y-16 text-center">
            {staff.map((member, index) => {
              const showImage = !!member.image && member.image.approvedForWeb;
              // First row (lg: 4 cols, md: 3, base: 2) sits just below the fold
              // after the hero. Load eagerly with high priority so the second
              // paint isn't blocked by the JS bundle. Everything else lazy-loads
              // with a generous prefetch margin so it's already in flight by
              // scroll time.
              const isFirstRow = index < 4;
              return (
                <li key={member.name}>
                  <MediaAperture
                    ratio="2/3"
                    src={showImage ? renderUrl(member.image!.src, { width: 720, quality: 60 }) : undefined}
                    srcSet={showImage ? renderSrcSet(member.image!.src, [360, 540, 720, 1080], 60) : undefined}
                    alt={
                      showImage
                        ? member.image!.alt
                        : `Portrait slot for ${member.name}`
                    }
                    sizes="(min-width: 1024px) 18vw, (min-width: 768px) 30vw, 46vw"
                    lazy={false}
                    fetchPriority={isFirstRow ? "high" : "low"}
                    prefetchMargin="2000px"
                    className={member.imageClassName}
                  />
                  <p className="mt-4 font-display text-lg md:text-xl leading-tight text-charcoal">
                    {member.name}
                  </p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-charcoal/55">
                    {member.role}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
