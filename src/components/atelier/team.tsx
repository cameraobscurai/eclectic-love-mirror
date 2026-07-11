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
        <aside className="lg:col-span-4">
          <div className="lg:sticky lg:top-24 max-w-[46vw] md:max-w-[26vw] lg:max-w-none">
            {principal && (
              <>
                <div>
                  <MediaAperture
                    ratio="2/3"
                    src={
                      principal.image?.approvedForWeb
                        ? renderUrl(principal.image.src, { width: 900, quality: 60 })
                        : undefined
                    }
                    srcSet={
                      principal.image?.approvedForWeb
                        ? renderSrcSet(principal.image.src, [360, 540, 720, 900, 1200], 60)
                        : undefined
                    }
                    alt={principal.image?.approvedForWeb ? principal.image.alt : `Portrait slot for ${principal.name}`}
                    sizes="(min-width: 1024px) 28vw, 100vw"
                    lazy={false}
                    fetchPriority="high"
                    prefetchMargin="2000px"
                    className={principal.imageClassName}
                  />
                </div>
                <div className="mt-6 space-y-1.5">
                  <p className="text-[9px] uppercase tracking-[0.3em] text-charcoal/50">
                    Principal
                  </p>
                  <h3 className="font-display text-2xl md:text-3xl lg:text-4xl text-charcoal leading-tight">
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
        <div className="lg:col-span-8">
          <header className="mb-10 md:mb-12 lg:mb-14">
            <h2 className="font-display text-charcoal leading-[1.05] text-3xl md:text-4xl lg:text-[clamp(2.5rem,4vw,3.5rem)]">
              ARTISTS, DESIGNERS, CRAFTSMEN
            </h2>
            <p className="mt-4 max-w-2xl text-[11px] md:text-[12px] uppercase tracking-[0.18em] leading-[1.8] text-charcoal/65">
              Our team moves across disciplines with intention and a shared approach. We are the atelier.
            </p>
          </header>

          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 md:gap-x-7 gap-y-10 md:gap-y-12 lg:gap-y-14 text-left">
            {staff.map((member, index) => {
              const showImage = !!member.image && member.image.approvedForWeb;
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
                    sizes="(min-width: 1024px) 16vw, (min-width: 768px) 26vw, 46vw"
                    lazy={false}
                    fetchPriority={isFirstRow ? "high" : "low"}
                    prefetchMargin="2000px"
                    className={member.imageClassName}
                  />
                  <p className="mt-4 lg:mt-5 font-display text-base md:text-lg lg:text-xl leading-tight text-charcoal">
                    {member.name}
                  </p>
                  <p className="mt-1.5 text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-charcoal/55">
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
